using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Emails;

/// <summary>The facts a Popkin reminder was recorded with: the day a story was due, the end a Popkin had.</summary>
public static class ReminderFacts
{
    public static string? Read(NotificationEvent notification, string name)
    {
        if (notification.Facts is not { Length: > 0 } facts)
        {
            return null;
        }

        using var json = JsonDocument.Parse(facts);
        return json.RootElement.TryGetProperty(name, out var value) ? value.GetString() : null;
    }
}

/// <summary>
/// Builds "Due tomorrow: {story}" from the story as it is now: one done, deleted, moved to another
/// day or given to someone else gives no email (send-reminders, L2-162 AC2, L2-167).
/// </summary>
public sealed class StoryDueEmailComposer(IAppDbContext db, NotificationLinks links, NotificationEmailSettings settings)
{
    private static readonly CultureInfo English = CultureInfo.GetCultureInfo("en-GB");

    /// <summary>The story and its Popkin when the reminder still stands for `personId`.</summary>
    public static async Task<(Story Story, PopkinSpace Popkin, Membership Owner)?> StandingAsync(
        IAppDbContext db, NotificationEvent notification, Guid personId, CancellationToken cancellationToken)
    {
        var story = await db.Stories.AsNoTracking().SingleOrDefaultAsync(s => s.Id == notification.SubjectId, cancellationToken);
        if (story is not { Column: not StoryColumn.Done, OwnerMembershipId: { } ownerId, DueDate: { } dueOn }
            || dueOn.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) != ReminderFacts.Read(notification, "dueOn"))
        {
            return null;
        }

        var owner = await db.Memberships.AsNoTracking().SingleOrDefaultAsync(m => m.Id == ownerId && m.LeftAt == null, cancellationToken);
        var popkin = await db.Popkins.AsNoTracking().SingleOrDefaultAsync(p => p.Id == story.PopkinId && p.Status == PopkinStatus.Active, cancellationToken);
        return owner?.PersonId == personId && popkin is not null ? (story, popkin, owner) : null;
    }

    public async Task<StoryDueEmailModel?> ComposeAsync(OutgoingEmail email, NotificationEvent notification, CancellationToken cancellationToken)
    {
        if (await StandingAsync(db, notification, email.PersonId, cancellationToken) is not var (story, popkin, owner))
        {
            return null;
        }

        var weekday = story.DueDate!.Value.ToString("dddd", English);
        var shell = new EmailShellModel(
            $"Due tomorrow: {story.Title}",
            $"Due tomorrow, {weekday}. It’s yours.",
            "Popkin",
            new PopkinHeader(popkin.Name, popkin.Emoji, popkin.Colour.ToString()),
            $"You’re getting this because a story of yours in {popkin.Name} is due tomorrow.",
            new EmailLink($"Mute {popkin.Name}", links.MutePopkin(popkin.Id)),
            links.Settings(),
            links.Unsubscribe(email.PersonId),
            settings.PostalAddress);
        return new StoryDueEmailModel(
            shell,
            story.Title,
            $"Due tomorrow, {weekday}.",
            PersonName.Initials(owner.DisplayName),
            story.Points,
            story.Tag.ToString(),
            TagColour(story.Tag),
            new EmailLink("Open the plan", links.Plan(popkin.Id)));
    }

    /// <summary>A tag's colour (`--color-tag-*`); its name is always written on it.</summary>
    private static string TagColour(StoryTag tag) => tag switch
    {
        StoryTag.Travel => "Sky",
        StoryTag.Stay => "Plum",
        StoryTag.Food => "Coral",
        StoryTag.Money => "Amber",
        _ => "Leaf",
    };
}

/// <summary>
/// Builds "{Popkin} wraps up in 24 hours" from the Popkin as it is now: one wrapped up, or given
/// another end, gives no email (send-reminders, L2-162 AC3, L2-167 AC2, AC4).
/// </summary>
public sealed class WrapUpEmailComposer(IAppDbContext db, NotificationLinks links, NotificationEmailSettings settings)
{
    private const int PhotosShown = 4;

    /// <summary>The Popkin when its reminder still stands: live, with the end it was recorded for.</summary>
    public static async Task<PopkinSpace?> StandingAsync(IAppDbContext db, NotificationEvent notification, CancellationToken cancellationToken)
    {
        var popkin = await db.Popkins.AsNoTracking().SingleOrDefaultAsync(p => p.Id == notification.PopkinId && p.Status == PopkinStatus.Active, cancellationToken);
        return popkin?.EndsAt is { } end && end.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture) == ReminderFacts.Read(notification, "endsAt")
            ? popkin
            : null;
    }

    /// <summary>"6 pm" or "6:30 pm", where the person is.</summary>
    public static string Time(DateTimeOffset at, TimeZoneInfo zone)
    {
        var local = TimeZoneInfo.ConvertTime(at, zone);
        var hour = local.Hour % 12 == 0 ? 12 : local.Hour % 12;
        var half = local.Hour < 12 ? "am" : "pm";
        return local.Minute == 0 ? $"{hour} {half}" : $"{hour}:{local.Minute:00} {half}";
    }

    public async Task<WrapUpEmailModel?> ComposeAsync(OutgoingEmail email, NotificationEvent notification, TimeZoneInfo zone, CancellationToken cancellationToken)
    {
        if (await StandingAsync(db, notification, cancellationToken) is not { } popkin)
        {
            return null;
        }

        var album = db.Photos.AsNoTracking().Where(p => p.PopkinId == popkin.Id && p.InAlbum);
        var count = await album.CountAsync(cancellationToken);
        var people = await album.Select(p => p.UploaderMembershipId).Distinct().CountAsync(cancellationToken);
        var mine = await album.CountAsync(p => db.Memberships.Any(m => m.Id == p.UploaderMembershipId && m.PersonId == email.PersonId), cancellationToken);
        var newest = await album.OrderByDescending(p => p.AddedAt).Take(PhotosShown).ToListAsync(cancellationToken);
        var shell = new EmailShellModel(
            $"{popkin.Name} wraps up in 24 hours",
            "Photos you add now make the recap.",
            "Popkin",
            new PopkinHeader(popkin.Name, popkin.Emoji, popkin.Colour.ToString()),
            "Everyone in a Popkin gets this once, a day before it wraps up.",
            new EmailLink($"Mute {popkin.Name}", links.MutePopkin(popkin.Id)),
            links.Settings(),
            links.Unsubscribe(email.PersonId),
            settings.PostalAddress);
        return new WrapUpEmailModel(
            shell,
            $"{popkin.Name} wraps up tomorrow at {Time(popkin.EndsAt!.Value, zone)}",
            "After that the chat closes and the album becomes a keepsake. Photos you add now make the recap.",
            newest.Select(p => new EmailPicture($"photo-{p.Id:N}", p.ThumbnailKey, p.Caption is { Length: > 0 } c ? EmailText.Cut(c, 60) : "A photo in the album")).ToList(),
            count == 0 ? null : $"{Count(count, "photo")} so far from {Count(people, "person", "people")}.",
            mine == 0 ? null : $"You’ve added {mine}.",
            new EmailLink("Add your photos", links.Album(popkin.Id)));
    }

    private static string Count(int n, string one, string? many = null) => n == 1 ? $"1 {one}" : $"{n} {many ?? one + "s"}";
}
