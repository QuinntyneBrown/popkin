using MediatR;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Auth;

/// <summary>Sends a six-digit code to a phone number or an email (L2-003 AC3, L2-006 AC1).</summary>
public sealed record RequestCodeCommand(CodePurpose Purpose, ContactChannel Channel, string? Destination) : IRequest<CodeSentDto>;

public sealed class RequestCodeCommandHandler(CodeIssuer issuer, SignInChannels channels) : IRequestHandler<RequestCodeCommand, CodeSentDto>
{
    public Task<CodeSentDto> Handle(RequestCodeCommand request, CancellationToken cancellationToken)
    {
        if (!channels.Offers(request.Channel))
        {
            // L2-084 AC2: phone sign-in is switched off.
            throw ProblemException.Invalid("channel_not_offered", "Codes can't be sent there yet.", "channel");
        }

        var destination = ContactRules.Normalise(request.Channel, request.Destination);
        return issuer.IssueAsync(request.Channel, destination, request.Purpose, cancellationToken);
    }
}
