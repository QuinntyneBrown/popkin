using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Administration.Auth;

/// <summary>The admin session handed back on success; the API sets the admin cookie from it.</summary>
public sealed record StartedAdminSession(Guid SessionId, Guid AdminId, DateTimeOffset ExpiresAt);

public sealed record ConfirmAdminCodeResult(AdminMeDto Admin, StartedAdminSession Started);

/// <summary>
/// Checks six digits sent to a staff email and signs the admin in (L2-088 AC4–AC6). A person who is
/// not an admin is refused with 403 `not_an_admin` and gets no session (L2-078 AC2).
/// </summary>
public sealed record ConfirmAdminCodeCommand(Guid VerificationId, string? Code) : IRequest<ConfirmAdminCodeResult>;

public sealed class ConfirmAdminCodeCommandHandler(IAppDbContext db, TimeProvider clock, ICodeHasher hasher)
    : IRequestHandler<ConfirmAdminCodeCommand, ConfirmAdminCodeResult>
{
    public async Task<ConfirmAdminCodeResult> Handle(ConfirmAdminCodeCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var code = await db.VerificationCodes.FirstOrDefaultAsync(
            c => c.Id == request.VerificationId && c.Purpose == CodePurpose.AdminSignIn, cancellationToken);
        if (code is null)
        {
            throw new ProblemException(400, "code_expired", "That code has expired.");
        }

        var signInLock = await db.AdminSignInLocks.FirstOrDefaultAsync(l => l.Email == code.Destination, cancellationToken);
        if (signInLock is not null && signInLock.IsLocked(now))
        {
            throw AdminCodes.Locked(signInLock);
        }

        if (code.IsExpired(now))
        {
            throw new ProblemException(400, "code_expired", "That code has expired.");
        }

        if (code.IsConsumed)
        {
            throw new ProblemException(400, "code_used", "That code has been used. Ask for a new one.");
        }

        if (signInLock is null)
        {
            signInLock = AdminSignInLock.For(code.Destination);
            db.AdminSignInLocks.Add(signInLock);
        }

        if (request.Code is null || !hasher.Matches(request.Code, code.CodeHash))
        {
            code.RecordFailedAttempt();
            signInLock.RecordWrong(now);
            await db.SaveChangesAsync(cancellationToken);
            if (signInLock.IsLocked(now))
            {
                throw AdminCodes.Locked(signInLock);
            }

            var mismatch = new ProblemException(400, "code_mismatch", "That code doesn't match.");
            mismatch.Extensions["attemptsLeft"] = signInLock.TriesLeft;
            throw mismatch;
        }

        signInLock.Reset();
        code.Consume(now);
        var admin = await db.Admins.FirstOrDefaultAsync(a => a.Email == code.Destination && a.RemovedAt == null, cancellationToken);
        if (admin is null)
        {
            await SaveAsync(cancellationToken);
            throw new ProblemException(403, "not_an_admin", "This account isn't an admin.");
        }

        admin.SignedIn(now);
        var session = AdminSession.Start(admin.Id, now);
        db.AdminSessions.Add(session);
        await SaveAsync(cancellationToken);
        return new ConfirmAdminCodeResult(AdminMeDto.From(admin), new StartedAdminSession(session.Id, admin.Id, session.ExpiresAt));
    }

    private async Task SaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Another confirmation consumed the code first (L2-005 AC5).
            throw new ProblemException(400, "code_used", "That code has been used. Ask for a new one.");
        }
    }
}
