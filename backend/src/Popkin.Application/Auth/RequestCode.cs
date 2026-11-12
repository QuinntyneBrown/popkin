using MediatR;
using Popkin.Domain;

namespace Popkin.Application.Auth;

/// <summary>Sends a six-digit code to a phone number or an email (L2-003 AC3, L2-006 AC1).</summary>
public sealed record RequestCodeCommand(CodePurpose Purpose, ContactChannel Channel, string? Destination) : IRequest<CodeSentDto>;

public sealed class RequestCodeCommandHandler(CodeIssuer issuer) : IRequestHandler<RequestCodeCommand, CodeSentDto>
{
    public Task<CodeSentDto> Handle(RequestCodeCommand request, CancellationToken cancellationToken)
    {
        var destination = ContactRules.Normalise(request.Channel, request.Destination);
        return issuer.IssueAsync(request.Channel, destination, request.Purpose, cancellationToken);
    }
}
