using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Popkin.Application.Notifications.Emails;

namespace Popkin.Infrastructure.Notifications;

/// <summary>
/// The unsubscribe link's token: the person's id, protected by ASP.NET Core Data Protection with
/// the purpose `Popkin.Notifications.Unsubscribe` and a lifetime of 90 days, so it cannot be
/// forged or altered and expires (unsubscribe design, L2-168).
/// </summary>
public sealed class UnsubscribeTokens(IDataProtectionProvider protection, TimeProvider clock) : IUnsubscribeTokens
{
    public const string Purpose = "Popkin.Notifications.Unsubscribe";

    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(90);

    private ITimeLimitedDataProtector Protector => protection.CreateProtector(Purpose).ToTimeLimitedDataProtector();

    public string Issue(Guid personId) => Protector.Protect(personId.ToString("N"), clock.GetUtcNow().Add(Lifetime));

    public Guid? Read(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        try
        {
            var unprotected = Protector.Unprotect(token, out var expires);
            return expires >= clock.GetUtcNow() && Guid.TryParseExact(unprotected, "N", out var personId) ? personId : null;
        }
        catch (CryptographicException)
        {
            return null;
        }
    }
}
