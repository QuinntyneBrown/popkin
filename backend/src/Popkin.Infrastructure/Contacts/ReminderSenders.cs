using System.Net;
using System.Text.Json;
using Azure.Communication.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Application.Abstractions;
using Popkin.Infrastructure.Auth;
using WebPush;

namespace Popkin.Infrastructure.Contacts;

/// <summary>The VAPID keys and subject Web Push signs with (ADR 0028).</summary>
public sealed record WebPushKeys(string PublicKey, string PrivateKey, string Subject);

/// <summary>
/// Sends a reminder to each of the person's devices by Web Push (ADR 0028). A subscription the
/// push service answers 404 or 410 is gone and is removed. Nothing about the reminder is logged.
/// </summary>
public sealed class WebPushPhoneNotificationSender(IServiceScopeFactory scopes, WebPushKeys keys, HttpClient http) : IPhoneNotificationSender
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<int> SendAsync(Guid personId, PhoneAlert alert, CancellationToken cancellationToken)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var devices = await db.PushSubscriptions.Where(s => s.PersonId == personId).ToListAsync(cancellationToken);
        if (devices.Count == 0)
        {
            return 0;
        }

        var client = new WebPushClient(http);
        var vapid = new VapidDetails(keys.Subject, keys.PublicKey, keys.PrivateKey);
        var payload = JsonSerializer.Serialize(
            new { title = alert.Title, body = alert.Body, url = alert.Url }, Json);
        var failed = 0;
        foreach (var device in devices)
        {
            try
            {
                await client.SendNotificationAsync(
                    new PushSubscription(device.Endpoint, device.P256dh, device.Auth), payload, vapid, cancellationToken);
            }
            catch (WebPushException exception) when (exception.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
            {
                db.PushSubscriptions.Remove(device);
            }
            catch (WebPushException)
            {
                failed++;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        if (failed == devices.Count)
        {
            throw new InvalidOperationException("No device took the phone alert.");
        }

        return devices.Count - failed;
    }
}

/// <summary>Sends nothing: no Web Push key is configured (ADR 0028).</summary>
public sealed class NoPhoneNotificationSender : IPhoneNotificationSender
{
    public Task<int> SendAsync(Guid personId, PhoneAlert alert, CancellationToken cancellationToken) => Task.FromResult(0);
}
