using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Application.Members;
using Popkin.Application.WrapUp;
using Popkin.Domain;

namespace Popkin.Application.Account;

/// <summary>
/// Deletes the caller's account (L2-049 AC4), in one unit of work: the active Popkins they host
/// wrap up, keeping their albums (AC3); every Popkin they are in keeps what they shared under
/// "Former member" with no photo (AC1); every session they hold ends, on every device; and the
/// person is marked deleted. `PurgeDeletedAccountsJob` erases the rest within 30 days. A failure
/// changes nothing.
/// </summary>
public sealed record DeleteAccountCommand : IRequest;

public sealed class DeleteAccountCommandHandler(
    IAppDbContext db,
    ICurrentPerson current,
    TimeProvider clock,
    PopkinWrapUpService wrapUp,
    MemberDepartures departures,
    IPhotoStore photos,
    ILogger<DeleteAccountCommandHandler> logger)
    : IRequestHandler<DeleteAccountCommand>
{
    public async Task Handle(DeleteAccountCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var person = await db.People.SingleAsync(p => p.Id == current.PersonId, cancellationToken);

        var hosted = await db.Popkins
            .Where(p => p.HostPersonId == person.Id && p.Status == PopkinStatus.Active)
            .ToListAsync(cancellationToken);
        var wrapUps = new List<(PopkinSpace Popkin, PreparedWrapUp Prepared)>();
        foreach (var popkin in hosted)
        {
            wrapUps.Add((popkin, await wrapUp.PrepareAsync(popkin, keepPhotos: true, cancellationToken)));
        }

        var memberships = await db.Memberships.Where(m => m.PersonId == person.Id && m.LeftAt == null).ToListAsync(cancellationToken);
        // The account's own photo stays until the erasure, which deletes it with the rest.
        var avatars = memberships.Select(m => m.PhotoKey).OfType<string>().Where(k => k != person.PhotoKey).Distinct().ToList();
        memberships.ForEach(m => m.Anonymise(now));

        var sessions = await db.Sessions.Where(s => s.PersonId == person.Id && s.RevokedAt == null).ToListAsync(cancellationToken);
        sessions.ForEach(s => s.Revoke(now));
        person.MarkDeleted(now);
        await db.SaveChangesAsync(cancellationToken);

        var failed = 0;
        foreach (var key in avatars)
        {
            try
            {
                await photos.DeleteAsync(key, CancellationToken.None);
            }
            catch (Exception exception)
            {
                failed++;
                logger.LogWarning(exception, "An avatar of a deleted account could not be deleted");
            }
        }

        if (failed > 0)
        {
            logger.LogWarning("{Count} avatars of a deleted account stay in the photo store", failed);
        }

        foreach (var (popkin, prepared) in wrapUps)
        {
            await wrapUp.AnnounceAsync(popkin, prepared.Calls);
        }

        // In every other Popkin the person was in, they left: the others are told, as when a
        // member leaves (L2-047).
        var wrapped = hosted.Select(p => p.Id).ToHashSet();
        foreach (var membership in memberships.Where(m => !wrapped.Contains(m.PopkinId)))
        {
            await departures.AnnounceAsync(membership.PopkinId, membership, CancellationToken.None);
        }
    }
}
