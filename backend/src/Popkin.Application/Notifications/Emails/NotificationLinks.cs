namespace Popkin.Application.Notifications.Emails;

/// <summary>
/// Absolute links to the web app (`App:Origin`): every link in an email is built here, carries no
/// tracking parameter, and opens a screen behind the session check (L2-163 AC6).
/// </summary>
public sealed class PopkinUrlBuilder(string origin)
{
    private readonly string _origin = origin.TrimEnd('/');

    public string To(string path) => _origin + (path.StartsWith('/') ? path : "/" + path);
}

/// <summary>The links of notification emails (popkin-update-email, unsubscribe).</summary>
public sealed class NotificationLinks(PopkinUrlBuilder urls, IUnsubscribeTokens tokens)
{
    public string Everyone(Guid popkinId) => urls.To($"/p/{popkinId}/chat/everyone");

    public string DirectMessage(Guid popkinId, Guid memberId) => urls.To($"/p/{popkinId}/chat/{memberId}");

    public string Album(Guid popkinId) => urls.To($"/p/{popkinId}/photos");

    public string Plan(Guid popkinId) => urls.To($"/p/{popkinId}/plan");

    public string Schedules(Guid popkinId) => urls.To($"/p/{popkinId}/schedule");

    public string Experiences(Guid popkinId) => urls.To($"/p/{popkinId}/experiences");

    public string Popkin(Guid popkinId) => urls.To($"/p/{popkinId}");

    /// <summary>The contact's profile in Contacts (L2-166 AC1).</summary>
    public string Contact(Guid contactId) => urls.To($"/contacts/people/{contactId}");

    /// <summary>"Notification settings": What you hear about (L2-168 AC2).</summary>
    public string Settings() => urls.To("/account/notifications?tab=types");

    /// <summary>"Mute {Popkin}": the Popkins tab with that Popkin muted (L2-158 AC4).</summary>
    public string MutePopkin(Guid popkinId) => urls.To($"/account/notifications?tab=popkins&mute={popkinId}");

    /// <summary>"Mute a Popkin": the Popkins tab, no change (L2-168 AC1).</summary>
    public string Popkins() => urls.To("/account/notifications?tab=popkins");

    /// <summary>"Stop birthday reminders for {name}" (L2-159 AC5).</summary>
    public string StopBirthday(Guid keyDateId) => urls.To($"/account/notifications?tab=people&stop-birthday={keyDateId}");

    /// <summary>"Unsubscribe from all email": works without a session (L2-168 AC3).</summary>
    public string Unsubscribe(Guid personId) => urls.To($"/unsubscribe?t={Uri.EscapeDataString(tokens.Issue(personId))}");

    /// <summary>The `List-Unsubscribe` one-click address (L2-168 AC4).</summary>
    public string UnsubscribePost(Guid personId) =>
        urls.To($"/api/notifications/unsubscribe?t={Uri.EscapeDataString(tokens.Issue(personId))}");
}

/// <summary>The token of an unsubscribe link: who it is for, for 90 days (unsubscribe design).</summary>
public interface IUnsubscribeTokens
{
    string Issue(Guid personId);

    /// <summary>The person, or null for a token that is forged, altered or past its 90 days.</summary>
    Guid? Read(string? token);
}
