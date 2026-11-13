using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>
/// The media relay a participant is handed when they join: the servers of `MediaRelay:Urls`
/// with short-lived TURN credentials of the shared-secret scheme (group-call). No relay is
/// ever called.
/// </summary>
public sealed class MediaRelayCredentialsTests
{
    private const string Secret = "a-secret-only-the-relay-and-the-api-know";

    private static string Sign(string username) =>
        Convert.ToBase64String(HMACSHA1.HashData(Encoding.UTF8.GetBytes(Secret), Encoding.UTF8.GetBytes(username)));

    private static ApiFactory ApiWithRelay(string? lifetime = null)
    {
        var api = new ApiFactory();
        api.Settings["MediaRelay:Urls:0"] = "turn:relay.popkin.example:3478";
        api.Settings["MediaRelay:Urls:1"] = "turns:relay.popkin.example:5349";
        api.Settings["MediaRelay:Secret"] = Secret;
        api.Settings["MediaRelay:CredentialLifetime"] = lifetime;
        return api;
    }

    // Given a relay and its shared secret are configured,
    // when two members join a call,
    // then each is handed the relay's addresses with a username of the hour the credential
    // expires at and their own membership, and the credential the relay will compute from it.
    [Fact]
    public async Task Each_participant_is_handed_credentials_of_their_own_that_expire_in_an_hour()
    {
        using var api = ApiWithRelay();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        var expiry = api.Clock.GetUtcNow().AddHours(1).ToUnixTimeSeconds();

        var mara = await lakeside.Host.OnCallAsync(lakeside.Id);
        var joels = await joel.OnCallAsync(lakeside.Id);

        var server = Assert.Single(mara.GetProperty("iceServers").EnumerateArray());
        Assert.Equal(["credential", "urls", "username"], server.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(
            ["turn:relay.popkin.example:3478", "turns:relay.popkin.example:5349"],
            server.GetProperty("urls").EnumerateArray().Select(u => u.GetString()));
        Assert.Equal($"{expiry}:{mara.ViewerMembershipId()}", server.GetProperty("username").GetString());
        Assert.Equal(Sign($"{expiry}:{mara.ViewerMembershipId()}"), server.GetProperty("credential").GetString());
        var joelServer = Assert.Single(joels.GetProperty("iceServers").EnumerateArray());
        Assert.Equal($"{expiry}:{joels.ViewerMembershipId()}", joelServer.GetProperty("username").GetString());
        Assert.Equal(Sign($"{expiry}:{joels.ViewerMembershipId()}"), joelServer.GetProperty("credential").GetString());
        Assert.NotEqual(server.GetProperty("credential").GetString(), joelServer.GetProperty("credential").GetString());
        // The secret itself never leaves the API.
        Assert.DoesNotContain(Secret, mara.GetRawText());
    }

    // Given `MediaRelay:CredentialLifetime` of ten minutes, the credential expires ten minutes from now.
    [Fact]
    public async Task The_credential_lives_as_long_as_the_setting_says()
    {
        using var api = ApiWithRelay(lifetime: "00:10:00");
        var lakeside = await api.StartLakesideAsync();
        var expiry = api.Clock.GetUtcNow().AddMinutes(10).ToUnixTimeSeconds();

        var joined = await lakeside.Host.OnCallAsync(lakeside.Id);

        var username = joined.GetProperty("iceServers")[0].GetProperty("username").GetString();
        Assert.Equal($"{expiry}:{joined.ViewerMembershipId()}", username);
        Assert.Equal(Sign(username!), joined.GetProperty("iceServers")[0].GetProperty("credential").GetString());
    }

    // Given only a STUN server and no secret, the server is named without a username or a
    // credential: a STUN server takes none.
    [Fact]
    public async Task A_server_without_a_secret_is_named_without_credentials()
    {
        using var api = new ApiFactory();
        api.Settings["MediaRelay:Urls:0"] = "stun:stun.popkin.example:3478";
        var lakeside = await api.StartLakesideAsync();

        var joined = await lakeside.Host.OnCallAsync(lakeside.Id);

        var server = Assert.Single(joined.GetProperty("iceServers").EnumerateArray());
        Assert.Equal(["urls"], server.EnumerateObject().Select(p => p.Name));
        Assert.Equal("stun:stun.popkin.example:3478", server.GetProperty("urls")[0].GetString());
    }
}
