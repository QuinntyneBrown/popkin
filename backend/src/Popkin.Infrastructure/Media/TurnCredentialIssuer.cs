using System.Security.Cryptography;
using System.Text;
using Popkin.Application.Abstractions;
using Popkin.Application.Calls;

namespace Popkin.Infrastructure.Media;

/// <summary>
/// The media relay of `MediaRelay:Urls`, with credentials of the TURN REST shared-secret
/// scheme: the username is the Unix time the credential expires at and the participant's
/// membership, and the credential is the base64 HMAC-SHA1 of that username under
/// `MediaRelay:Secret`, which the relay computes again to check it. Nothing calls the relay
/// from here. With no address configured it names no server: in local development the peers
/// are on one machine and connect without a relay. Without a secret the servers are named
/// without credentials, which is all a STUN server takes.
/// </summary>
public sealed class TurnCredentialIssuer(IReadOnlyList<string> urls, string? secret, TimeSpan lifetime, TimeProvider clock)
    : IMediaRelayCredentials
{
    /// <summary>How long a credential lives unless `MediaRelay:CredentialLifetime` says otherwise.</summary>
    public static readonly TimeSpan DefaultLifetime = TimeSpan.FromHours(1);

    public IReadOnlyList<IceServerDto> IssueFor(Guid membershipId)
    {
        if (urls.Count == 0)
        {
            return [];
        }

        if (string.IsNullOrEmpty(secret))
        {
            return [new IceServerDto(urls)];
        }

        var username = $"{clock.GetUtcNow().Add(lifetime).ToUnixTimeSeconds()}:{membershipId}";
        var credential = Convert.ToBase64String(HMACSHA1.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(username)));
        return [new IceServerDto(urls, username, credential)];
    }
}
