using Popkin.Domain;

namespace Popkin.Application.Auth;

public sealed record CodeSentDto(Guid VerificationId, ContactChannel Channel, string DisplayDestination, DateTimeOffset ResendAvailableAt)
{
    public static CodeSentDto From(VerificationCode code) =>
        new(code.Id, code.Channel, ContactRules.Display(code.Channel, code.Destination), code.ResendAvailableAt);
}
