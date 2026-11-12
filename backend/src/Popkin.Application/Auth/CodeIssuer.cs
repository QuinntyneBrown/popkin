using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Auth;

/// <summary>
/// The issuing rules shared by requesting and resending a code: at most five per destination in
/// any hour (L2-005 AC4), earlier codes superseded (L2-005 AC2), only a hash stored (L2-054 AC4).
/// It never reads <see cref="Person"/>, so nobody learns who has an account (L2-006 AC2).
/// </summary>
public sealed class CodeIssuer(
    IAppDbContext db,
    TimeProvider clock,
    ICodeGenerator generator,
    ICodeHasher hasher,
    IEnumerable<ICodeSender> senders)
{
    public async Task<CodeSentDto> IssueAsync(ContactChannel channel, string destination, CodePurpose purpose, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var windowStart = now - VerificationCode.LimitWindow;
        var recent = await db.VerificationCodes
            .Where(c => c.Destination == destination && c.SentAt > windowStart)
            .Select(c => c.SentAt)
            .ToListAsync(cancellationToken);
        if (recent.Count >= VerificationCode.MaxPerWindow)
        {
            var retryAfter = recent.Min() + VerificationCode.LimitWindow - now;
            var problem = new ProblemException(429, "code_limit_reached", "Too many codes for now.", retryAfter: retryAfter);
            throw problem;
        }

        var earlier = await db.VerificationCodes
            .Where(c => c.Destination == destination && c.Purpose == purpose && c.ConsumedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var code in earlier)
        {
            code.Supersede(now);
        }

        var plain = generator.NewCode();
        var issued = VerificationCode.Issue(channel, destination, purpose, hasher.Hash(plain), now);
        db.VerificationCodes.Add(issued);
        await db.SaveChangesAsync(cancellationToken);

        try
        {
            await senders.Single(s => s.Channel == channel).SendAsync(destination, plain, cancellationToken);
        }
        catch (CodeNotSentException)
        {
            issued.Consume(now);
            await db.SaveChangesAsync(cancellationToken);
            throw new ProblemException(503, "code_not_sent", "We couldn't send your code.");
        }

        return CodeSentDto.From(issued);
    }
}
