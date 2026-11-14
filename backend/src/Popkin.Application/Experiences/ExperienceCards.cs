using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>Builds the cards of experiences of one Popkin, in the order given.</summary>
public static class ExperienceCards
{
    public static async Task<IReadOnlyList<ExperienceCardDto>> OfAsync(
        IAppDbContext db, IPhotoStore store, PopkinSpace popkin, IReadOnlyList<Experience> experiences, CancellationToken cancellationToken)
    {
        // A member who has left still shared their experiences, so sharers are read whether or not they are still in.
        var sharerIds = experiences.Select(e => e.SharerMembershipId).Distinct().ToList();
        var sharers = await db.Memberships.AsNoTracking().Where(m => sharerIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
        var scoreOf = await ExperienceScores.OfAsync(db, experiences, cancellationToken);
        var keenOf = await KeenOf.CountsAsync(db, experiences, cancellationToken);

        return experiences.Select(e => ExperienceCardDto.Of(e, popkin, sharers[e.SharerMembershipId], scoreOf(e), keenOf(e), store)).ToList();
    }
}
