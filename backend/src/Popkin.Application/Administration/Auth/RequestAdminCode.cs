using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Auth;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Administration.Auth;

/// <summary>
/// Sends a six-digit code to a staff email (L2-088 AC3). It never reads <see cref="Admin"/>, so the
/// answer is the same whether or not the email is an admin's; a locked email is refused (L2-088 AC6).
/// </summary>
public sealed record RequestAdminCodeCommand(string? Email) : IRequest<AdminCodeSentDto>;

public sealed class RequestAdminCodeCommandHandler(IAppDbContext db, TimeProvider clock, CodeIssuer issuer)
    : IRequestHandler<RequestAdminCodeCommand, AdminCodeSentDto>
{
    public async Task<AdminCodeSentDto> Handle(RequestAdminCodeCommand request, CancellationToken cancellationToken)
    {
        var email = ContactRules.Normalise(ContactChannel.Email, request.Email);
        await AdminCodes.RefuseWhenLockedAsync(db, email, clock.GetUtcNow(), cancellationToken);
        return await AdminCodes.IssueAsync(db, issuer, email, cancellationToken);
    }
}

/// <summary>Sends a new admin code once 30 seconds have passed (L2-088 AC7, L2-005 AC1, AC2).</summary>
public sealed record ResendAdminCodeCommand(Guid VerificationId) : IRequest<AdminCodeSentDto>;

public sealed class ResendAdminCodeCommandHandler(IAppDbContext db, TimeProvider clock, CodeIssuer issuer)
    : IRequestHandler<ResendAdminCodeCommand, AdminCodeSentDto>
{
    public async Task<AdminCodeSentDto> Handle(ResendAdminCodeCommand request, CancellationToken cancellationToken)
    {
        var code = await db.VerificationCodes.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.VerificationId && c.Purpose == CodePurpose.AdminSignIn, cancellationToken)
            ?? throw new ProblemException(400, "verification_unknown", "Start again to get a code.");
        var now = clock.GetUtcNow();
        await AdminCodes.RefuseWhenLockedAsync(db, code.Destination, now, cancellationToken);
        var wait = code.ResendAvailableAt - now;
        if (wait > TimeSpan.Zero)
        {
            throw new ProblemException(429, "code_resend_too_soon", "Wait a moment before asking for a new code.", retryAfter: wait);
        }

        return await AdminCodes.IssueAsync(db, issuer, code.Destination, cancellationToken);
    }
}

internal static class AdminCodes
{
    public static async Task RefuseWhenLockedAsync(IAppDbContext db, string email, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var signInLock = await db.AdminSignInLocks.AsNoTracking().FirstOrDefaultAsync(l => l.Email == email, cancellationToken);
        if (signInLock is not null && signInLock.IsLocked(now))
        {
            throw Locked(signInLock);
        }
    }

    public static async Task<AdminCodeSentDto> IssueAsync(IAppDbContext db, CodeIssuer issuer, string email, CancellationToken cancellationToken)
    {
        var sent = await issuer.IssueAsync(ContactChannel.Email, email, CodePurpose.AdminSignIn, cancellationToken);
        var code = await db.VerificationCodes.AsNoTracking().SingleAsync(c => c.Id == sent.VerificationId, cancellationToken);
        return AdminCodeSentDto.From(code);
    }

    public static ProblemException Locked(AdminSignInLock signInLock)
    {
        var problem = new ProblemException(429, "admin_locked", "Too many wrong codes.");
        problem.Extensions["lockedUntil"] = signInLock.LockedUntil;
        return problem;
    }
}
