using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts;

namespace Popkin.Application.Account;

/// <summary>
/// Erases the personal data of every deleted account not yet erased (L2-049 AC4, L2-054): the
/// account's photo file, its sessions, the codes sent to its phone number or email before it was
/// deleted (a new account may have signed up with it since), and its name,
/// phone number, email and photo. The Worker sends it on each daily tick of
/// `PurgeDeletedAccountsJob`, so erasure comes within a day of deletion. Returns how many
/// accounts it erased. Nothing it logs names the person.
/// </summary>
public sealed record PurgeDeletedAccountsCommand : IRequest<int>;

public sealed class PurgeDeletedAccountsCommandHandler(
    IAppDbContext db, IPhotoStore photos, TimeProvider clock, ILogger<PurgeDeletedAccountsCommandHandler> logger)
    : IRequestHandler<PurgeDeletedAccountsCommand, int>
{
    /// <summary>How many accounts are read at a time.</summary>
    public const int BatchSize = 100;

    public async Task<int> Handle(PurgeDeletedAccountsCommand request, CancellationToken cancellationToken)
    {
        var erased = 0;
        var failed = new List<Guid>();
        // Once stopping is asked, no new batch is begun; the one in hand is finished.
        while (!cancellationToken.IsCancellationRequested)
        {
            var due = await db.People
                .Where(p => p.DeletedAt != null && p.ErasedAt == null && !failed.Contains(p.Id))
                .OrderBy(p => p.DeletedAt)
                .Take(BatchSize)
                .ToListAsync(cancellationToken);
            if (due.Count == 0)
            {
                break;
            }

            foreach (var person in due)
            {
                try
                {
                    await EraseAsync(person);
                    erased++;
                }
                catch (Exception exception)
                {
                    // Tried again on the next tick.
                    failed.Add(person.Id);
                    db.People.Entry(person).State = EntityState.Unchanged;
                    logger.LogError(exception, "A deleted account could not be erased");
                }
            }
        }

        return erased;
    }

    private async Task EraseAsync(Domain.Person person)
    {
        if (person.PhotoKey is { } photoKey)
        {
            await photos.DeleteAsync(photoKey, CancellationToken.None);
        }

        var destinations = new[] { person.Phone, person.Email }.OfType<string>().ToList();
        db.Sessions.RemoveRange(await db.Sessions.Where(s => s.PersonId == person.Id).ToListAsync(CancellationToken.None));
        db.VerificationCodes.RemoveRange(
            await db.VerificationCodes
                .Where(c => destinations.Contains(c.Destination) && c.SentAt <= person.DeletedAt)
                .ToListAsync(CancellationToken.None));
        // Their Contacts go with them, and the files they kept (L2-132, known gap 110).
        var contactFiles = await ContactRemoval.RemoveAsync(
            db, db.Contacts.Where(c => c.OwnerId == person.Id), CancellationToken.None);
        db.ReminderPreferences.RemoveRange(db.ReminderPreferences.Where(p => p.OwnerId == person.Id));
        db.ContactGroups.RemoveRange(db.ContactGroups.Where(g => g.OwnerId == person.Id));
        // A follow-up for nobody names no contact, so ContactRemoval leaves it.
        db.FollowUps.RemoveRange(db.FollowUps.Where(f => f.OwnerId == person.Id));
        db.ImportBatches.RemoveRange(db.ImportBatches.Where(b => b.OwnerId == person.Id));
        db.ContactReminders.RemoveRange(db.ContactReminders.Where(r => r.OwnerId == person.Id));
        db.ContactWeeklyEmails.RemoveRange(db.ContactWeeklyEmails.Where(e => e.OwnerId == person.Id));
        db.PushSubscriptions.RemoveRange(db.PushSubscriptions.Where(s => s.PersonId == person.Id));
        // Their notification settings, and every mute they made or that named them (L2-160).
        db.NotificationPreferences.RemoveRange(db.NotificationPreferences.Where(p => p.PersonId == person.Id));
        db.NotificationKindChoices.RemoveRange(db.NotificationKindChoices.Where(c => c.PersonId == person.Id));
        db.PersonMutes.RemoveRange(db.PersonMutes.Where(m => m.PersonId == person.Id || m.MutedPersonId == person.Id));
        // Others keep the contact they imported of them, but no longer linked to the account,
        // so "Also in your Popkin" goes (known gap 117, ruled).
        foreach (var imported in await db.Contacts.Where(c => c.PersonId == person.Id).ToListAsync(CancellationToken.None))
        {
            imported.ForgetPerson();
        }
        person.Erase(clock.GetUtcNow());
        await db.SaveChangesAsync(CancellationToken.None);
        await ContactRemoval.DeleteFilesAsync(photos, contactFiles, logger);
    }
}
