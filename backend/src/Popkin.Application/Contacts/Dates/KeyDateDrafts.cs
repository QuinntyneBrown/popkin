using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Dates;

/// <summary>
/// A key date as Add someone and Edit send it with the contact (L2-129 AC2): `id` for one kept,
/// none for one added. Only a kept date's reminder changes; its day is not changed once added
/// (known gap 103, ruled).
/// </summary>
public sealed record KeyDateDraftDto(
    Guid? Id,
    string? Kind,
    string? Title,
    int? Month,
    int? Day,
    int? Year,
    bool EveryYear,
    string? Reminder);

/// <summary>Saves a contact's "Dates to remember" in the contact's own save.</summary>
public static class KeyDateDrafts
{
    /// <summary>Checks every draft before anything is saved: a real day and a lead offered.</summary>
    public static IReadOnlyList<(KeyDateDraftDto Draft, KeyDateKind Kind, ReminderLead Lead)> Validate(IReadOnlyList<KeyDateDraftDto>? drafts) =>
        (drafts ?? []).Select(draft =>
        {
            var kind = Enum.TryParse<KeyDateKind>(draft.Kind, out var k) && Enum.IsDefined(k)
                ? k
                : throw Invalid();
            if (draft.Month is not { } month || draft.Day is not { } day || (!draft.EveryYear && draft.Year is null)
                || !KeyDate.IsDay(month, day, draft.Year) || draft.Title?.Trim().Length > KeyDate.MaxTitleLength)
            {
                throw Invalid();
            }

            var lead = Enum.TryParse<ReminderLead>(draft.Reminder, out var l) && Enum.IsDefined(l)
                ? l
                : throw ProblemException.Invalid("reminder_not_allowed", "Choose when to be reminded.", "keyDates");
            return (draft, kind, lead);
        }).ToList();

    /// <summary>
    /// Adds the drafts without an id, changes the reminder of those kept, and removes a kept date
    /// left out. Nothing is saved; the caller saves once.
    /// </summary>
    public static async Task ApplyAsync(
        IAppDbContext db,
        Contact contact,
        IReadOnlyList<(KeyDateDraftDto Draft, KeyDateKind Kind, ReminderLead Lead)> drafts,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var kept = await db.KeyDates.OwnedBy(contact.OwnerId).Where(d => d.ContactId == contact.Id).ToListAsync(cancellationToken);
        foreach (var (draft, kind, lead) in drafts)
        {
            if (draft.Id is { } id)
            {
                (kept.FirstOrDefault(d => d.Id == id) ?? throw KeyDateRules.NotFound()).ChangeLead(lead);
                continue;
            }

            db.KeyDates.Add(KeyDate.Create(
                contact.OwnerId, Guid.NewGuid(), contact.Id, kind, draft.Title, draft.Month!.Value, draft.Day!.Value, draft.Year, draft.EveryYear, lead, now));
        }

        var named = drafts.Select(d => d.Draft.Id).OfType<Guid>().ToHashSet();
        db.KeyDates.RemoveRange(kept.Where(d => !named.Contains(d.Id)));
    }

    /// <summary>The contact's dates as the profile shows them, once saved.</summary>
    public static async Task<IReadOnlyList<ContactKeyDateDto>> ForProfileAsync(
        IAppDbContext db, Contact contact, DateOnly today, CancellationToken cancellationToken) =>
        KeyDateRules.ForProfile(
            await db.KeyDates.OwnedBy(contact.OwnerId).AsNoTracking().Where(d => d.ContactId == contact.Id).ToListAsync(cancellationToken),
            today);

    private static ProblemException Invalid() =>
        ProblemException.Invalid("key_date_invalid", "Pick the day, so we know when to remind you.", "keyDates");
}
