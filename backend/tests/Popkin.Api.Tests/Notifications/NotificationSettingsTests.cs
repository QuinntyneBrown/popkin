using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Notifications;

/// <summary>GET /api/me/notifications: the Notifications screen in one read (L2-154, L2-155, L2-156).</summary>
public sealed class NotificationSettingsTests
{
    // Given Mara, who signed up by email and has never changed a notification setting,
    // when she reads her notification settings,
    // then activity email is on, as it happens, and each kind of the three groups is on or off as
    // L2-154's table says, with "Sign-in codes and security" required.
    [Fact]
    public async Task A_new_person_reads_the_defaults()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpByEmailAsync("Mara Okafor", "mara@example.com");

        var settings = await mara.GetFromJsonAsync<JsonElement>("/api/me/notifications");

        var email = settings.GetProperty("email");
        Assert.True(email.GetProperty("on").GetBoolean());
        Assert.True(email.GetProperty("available").GetBoolean());
        Assert.Equal("AsItHappens", email.GetProperty("frequency").GetString());

        var groups = settings.GetProperty("groups").EnumerateArray().ToList();
        Assert.Equal(["When something changes", "Reminders", "Your account"], groups.Select(g => g.GetProperty("name").GetString()));
        Assert.Equal("Anything new in a Popkin you’re in.", groups[0].GetProperty("about").GetString());
        var kinds = groups.SelectMany(g => g.GetProperty("kinds").EnumerateArray()).ToList();
        Assert.Equal(12, kinds.Count);

        var groupChat = kinds.Single(k => k.GetProperty("kind").GetString() == "GroupChat");
        Assert.Equal("Group chat", groupChat.GetProperty("name").GetString());
        Assert.Equal("New messages in a Popkin’s chat", groupChat.GetProperty("about").GetString());
        Assert.False(groupChat.GetProperty("email").GetBoolean());
        Assert.True(groupChat.GetProperty("phone").GetBoolean());
        Assert.False(groupChat.GetProperty("required").GetBoolean());
        Assert.False(groupChat.GetProperty("offForEveryone").GetBoolean());

        var signIn = kinds.Single(k => k.GetProperty("kind").GetString() == "SignInAndSecurity");
        Assert.True(signIn.GetProperty("required").GetBoolean());
        Assert.True(signIn.GetProperty("email").GetBoolean());
        Assert.False(signIn.GetProperty("phone").GetBoolean());
    }

    // Given Theo, who signs in by phone and has no email address,
    // when he reads his notification settings,
    // then email is off and not available (L2-156 AC5).
    [Fact]
    public async Task An_account_without_an_email_address_has_no_email_to_switch_on()
    {
        using var api = new ApiFactory();
        var theo = await api.SignedUpAsync("Theo Lin", "(415) 555-0100");

        var settings = await theo.GetFromJsonAsync<JsonElement>("/api/me/notifications");

        var email = settings.GetProperty("email");
        Assert.False(email.GetProperty("on").GetBoolean());
        Assert.False(email.GetProperty("available").GetBoolean());
    }

    // Given no session, when the settings are read, then 401 (L2-174 AC4).
    [Fact]
    public async Task No_session_reads_nothing()
    {
        using var api = new ApiFactory();

        var response = await api.CreateBrowserClient().GetAsync("/api/me/notifications");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
