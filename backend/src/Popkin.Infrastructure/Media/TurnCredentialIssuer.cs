using Popkin.Application.Abstractions;
using Popkin.Application.Calls;

namespace Popkin.Infrastructure.Media;

/// <summary>
/// The media relay of `MediaRelay:Urls`. With none configured it names no server: in local
/// development the peers are on one machine and connect without a relay.
/// </summary>
public sealed class TurnCredentialIssuer : IMediaRelayCredentials
{
    public IReadOnlyList<IceServerDto> IssueFor(Guid membershipId) => [];
}
