using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Auth;

public enum ConfirmOutcome
{
    SignedIn,
    NameRequired,
}

/// <summary>The session handed back on success; the API sets the cookie from it.</summary>
public sealed record StartedSession(Guid SessionId, Guid PersonId, DateTimeOffset ExpiresAt);

public sealed record ConfirmCodeResult(ConfirmOutcome Outcome, SessionDto? Session, bool IsNewPerson, StartedSession? Started);

/// <summary>Checks six digits against a code and signs the person in (L2-004, L2-005 AC3, AC5).</summary>
public sealed record ConfirmCodeCommand(Guid VerificationId, string? Code, string? Name) : IRequest<ConfirmCodeResult>;

public sealed class ConfirmCodeCommandHandler(IAppDbContext db, TimeProvider clock, ICodeHasher hasher)
    : IRequestHandler<ConfirmCodeCommand, ConfirmCodeResult>
{
    public async Task<ConfirmCodeResult> Handle(ConfirmCodeCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var code = await db.VerificationCodes.FirstOrDefaultAsync(c => c.Id == request.VerificationId, cancellationToken);
        if (code is null || code.IsExpired(now))
        {
            throw new ProblemException(400, "code_expired", "That code has expired.");
        }

        if (code.IsConsumed)
        {
            throw new ProblemException(400, "code_used", "That code has been used. Ask for a new one.");
        }

        if (code.AttemptsExhausted)
        {
            throw new ProblemException(400, "code_attempts_exhausted", "Too many tries. Ask for a new code.");
        }

        if (request.Code is null || !hasher.Matches(request.Code, code.CodeHash))
        {
            code.RecordFailedAttempt();
            await db.SaveChangesAsync(cancellationToken);
            var mismatch = new ProblemException(400, "code_mismatch", "That code doesn't match. Try again.");
            mismatch.Extensions["attemptsLeft"] = code.AttemptsLeft;
            throw mismatch;
        }

        var person = await db.People.FirstOrDefaultAsync(
            p => p.DeletedAt == null && (code.Channel == ContactChannel.Phone ? p.Phone == code.Destination : p.Email == code.Destination),
            cancellationToken);
        var isNew = person is null;
        if (person is null)
        {
            if (request.Name is null)
            {
                return new ConfirmCodeResult(ConfirmOutcome.NameRequired, null, true, null);
            }

            var name = request.Name.Trim();
            if (name.Length is 0 or > Person.MaxNameLength)
            {
                throw ProblemException.Invalid("name_invalid", "Enter a name of 1 to 40 characters.", "name");
            }

            person = Person.Create(name, code.Channel, code.Destination, now);
            db.People.Add(person);
        }

        code.Consume(now);
        var session = Session.Start(person.Id, now);
        db.Sessions.Add(session);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Another confirmation consumed the code first (L2-005 AC5).
            throw new ProblemException(400, "code_used", "That code has been used. Ask for a new one.");
        }

        return new ConfirmCodeResult(
            ConfirmOutcome.SignedIn,
            new SessionDto(person.Id, person.Name, null),
            isNew,
            new StartedSession(session.Id, person.Id, session.ExpiresAt));
    }
}
