using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// /api/me/time-zone and /api/me/push-…: where the person is and the devices that take phone
/// alerts serve every kind of notification, not Contacts alone (L2-161 AC7, L2-157 AC5, ADR 0028).
/// </summary>
public sealed class DeviceTests
{
    // Given Contacts switched off, when Mara's app saves its zone, then it is kept as hers and a
    // zone the server does not know is refused with 400 `invalid_time_zone`.
    [Fact]
    public async Task The_time_zone_is_saved_whatever_features_are_on()
    {
        using var api = new ApiFactory();
        api.Settings["Features:Contacts"] = "false";
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var saved = await mara.PutAsJsonAsync("/api/me/time-zone", new { zone = "America/Los_Angeles" });
        var wrong = await mara.PutAsJsonAsync("/api/me/time-zone", new { zone = "Lakeside/Weekend" });

        Assert.Equal(HttpStatusCode.NoContent, saved.StatusCode);
        await wrong.AssertProblem(HttpStatusCode.BadRequest, "invalid_time_zone");
        using var scope = api.Services.CreateScope();
        Assert.Equal("America/Los_Angeles", scope.ServiceProvider.GetRequiredService<AppDbContext>().NotificationPreferences.Single().TimeZone);
    }

    // Given Contacts switched off and no Web Push key, when Mara's device subscribes, subscribes
    // again and unsubscribes, then the key reads empty, each answers 204, and an endpoint that is
    // not https is refused (ADR 0028).
    [Fact]
    public async Task A_device_subscribes_once_and_unsubscribes()
    {
        using var api = new ApiFactory();
        api.Settings["Features:Contacts"] = "false";
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var device = new { endpoint = "https://push.example.com/send/abc", p256dh = "BNcRd", auth = "tBHI" };

        var key = await mara.GetFromJsonAsync<JsonElement>("/api/me/push-key");
        var first = await mara.PostAsJsonAsync("/api/me/push-subscriptions", device);
        var again = await mara.PostAsJsonAsync("/api/me/push-subscriptions", device);
        var plain = await mara.PostAsJsonAsync("/api/me/push-subscriptions", device with { endpoint = "http://push.example.com/send/abc" });
        var removed = await mara.DeleteAsync($"/api/me/push-subscriptions?endpoint={Uri.EscapeDataString(device.endpoint)}");

        Assert.Equal("", key.GetProperty("publicKey").GetString());
        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        await plain.AssertProblem(HttpStatusCode.BadRequest, "invalid_push_subscription");
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
    }
}
