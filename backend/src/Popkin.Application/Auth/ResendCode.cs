using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;

namespace Popkin.Application.Auth;

/// <summary>Sends a new code for the same destination once 30 seconds have passed (L2-005 AC1, AC2).</summary>
public sealed record ResendCodeCommand(Guid VerificationId) : IRequest<CodeSentDto>;

public sealed class ResendCodeCommandHandler(IAppDbContext db, TimeProvider clock, CodeIssuer issuer)
    : IRequestHandler<ResendCodeCommand, CodeSentDto>
{
    public async Task<CodeSentDto> Handle(ResendCodeCommand request, CancellationToken cancellationToken)
    {
        var code = await db.VerificationCodes.AsNoTracking().FirstOrDefaultAsync(c => c.Id == request.VerificationId, cancellationToken)
            ?? throw new ProblemException(400, "verification_unknown", "Start again to get a code.");
        var wait = code.ResendAvailableAt - clock.GetUtcNow();
        if (wait > TimeSpan.Zero)
        {
            throw new ProblemException(429, "code_resend_too_soon", "Wait a moment before asking for a new code.", retryAfter: wait);
        }

        return await issuer.IssueAsync(code.Channel, code.Destination, code.Purpose, cancellationToken);
    }
}
