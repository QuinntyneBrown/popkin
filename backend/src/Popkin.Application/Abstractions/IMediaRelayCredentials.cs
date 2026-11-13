using Popkin.Application.Calls;

namespace Popkin.Application.Abstractions;

/// <summary>
/// The media relay (STUN/TURN) a participant's browser uses to reach the others, with
/// credentials that are theirs alone and expire soon. Empty where no relay is configured.
/// </summary>
public interface IMediaRelayCredentials
{
    IReadOnlyList<IceServerDto> IssueFor(Guid membershipId);
}
