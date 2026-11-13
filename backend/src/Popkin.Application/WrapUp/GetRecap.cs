using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Experiences;
using Popkin.Application.Invites;
using Popkin.Application.Photos;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.WrapUp;

/// <summary>A photo as the recap shows it: its thumbnail at an expiring address (L2-051 AC2).</summary>
public sealed record RecapPhotoDto(Guid Id, string ThumbnailUrl);

/// <summary>Who shared the top-rated moment: a first name, never a contact detail (L2-054 AC2).</summary>
public sealed record RecapSharerDto(string FirstName);

/// <summary>The top-rated moment: the experience with the highest score, with its score and who shared it (L2-046 AC3).</summary>
public sealed record TopRatedDto(Guid ExperienceId, string Title, double Average, int RatingCount, RecapSharerDto SharedBy);

/// <summary>
/// The recap of a wrapped-up Popkin (L2-046): what it was, when it ran, the people who showed
/// up, the messages sent, the photos shared with the latest three of them, the first few
/// members as avatars, and the top-rated moment when anything was rated.
/// </summary>
public sealed record RecapDto(
    Guid Id,
    string Name,
    string Emoji,
    PopkinColour Colour,
    DateTimeOffset StartedAt,
    DateTimeOffset WrappedUpAt,
    bool KeepPhotos,
    DateTimeOffset? PhotosRemoveAt,
    DateTimeOffset? PhotosRemovedAt,
    bool IsHost,
    int PeopleCount,
    int MessageCount,
    int PhotoCount,
    IReadOnlyList<RecapPhotoDto> Photos,
    IReadOnlyList<AvatarDto> Avatars,
    TopRatedDto? TopRated);

/// <summary>The recap, for any member of a wrapped-up Popkin (L2-046, L2-051 AC1).</summary>
public sealed record GetRecapQuery(Guid PopkinId) : IRequest<RecapDto>;

public sealed class GetRecapQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store)
    : IRequestHandler<GetRecapQuery, RecapDto>
{
    /// <summary>The recap shows three photos (L2-046 AC1).</summary>
    public const int MaxPhotos = 3;

    /// <summary>The recap shows up to four avatars, as the header of the Popkin home does.</summary>
    public const int MaxAvatars = 4;

    public async Task<RecapDto> Handle(GetRecapQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireWrappedUpMemberAsync(request.PopkinId, cancellationToken);

        // Everyone who showed up, whether or not they left since.
        var people = await db.Memberships.AsNoTracking().CountAsync(m => m.PopkinId == popkin.Id, cancellationToken);
        var members = await InviteMembers.OfAsync(db, popkin, cancellationToken);
        // The latest three; none once the album was removed (L2-045 AC4).
        var photos = await db.Photos.AsNoTracking().Where(p => p.PopkinId == popkin.Id).LatestFirst().Take(MaxPhotos).ToListAsync(cancellationToken);

        return new RecapDto(
            popkin.Id,
            popkin.Name,
            popkin.Emoji,
            popkin.Colour,
            popkin.CreatedAt,
            popkin.WrappedUpAt!.Value,
            popkin.KeepPhotos,
            popkin.PhotosRemoveAt,
            popkin.PhotosRemovedAt,
            membership.Role == MembershipRole.Host,
            people,
            await RecapCounts.MessagesAsync(db, popkin.Id, cancellationToken),
            await RecapCounts.PhotosAsync(db, popkin, cancellationToken),
            photos.Select(p => new RecapPhotoDto(p.Id, store.GetReadUrl(p.ThumbnailKey))).ToList(),
            members.Take(MaxAvatars).Select(m => AvatarDto.Of(m, store)).ToList(),
            await TopRatedAsync(popkin, cancellationToken));
    }

    private async Task<TopRatedDto?> TopRatedAsync(PopkinSpace popkin, CancellationToken cancellationToken)
    {
        var experiences = await db.Experiences.AsNoTracking().Where(e => e.PopkinId == popkin.Id).ToListAsync(cancellationToken);
        var scoreOf = await ExperienceScores.OfAsync(db, experiences, cancellationToken);
        if (TopRatedMoment.Pick(experiences.Select(e => (e, scoreOf(e)))) is not var (experience, score))
        {
            return null;
        }

        // A member who has left still shared it.
        var sharer = await db.Memberships.AsNoTracking().FirstAsync(m => m.Id == experience.SharerMembershipId, cancellationToken);
        return new TopRatedDto(
            experience.Id, experience.Title, score.Average!.Value, score.Count, new RecapSharerDto(PersonName.FirstName(sharer.DisplayName)));
    }
}

/// <summary>Chooses the top-rated moment of a Popkin from its experiences and their scores.</summary>
public static class TopRatedMoment
{
    /// <summary>
    /// The rated experience with the highest average as it is shown, to one decimal. Of several,
    /// the one more members rated; of those, the one shared first. Null when nothing was rated,
    /// and something the group wants to do is never rated.
    /// </summary>
    public static (Experience Experience, ExperienceScore Score)? Pick(IEnumerable<(Experience Experience, ExperienceScore Score)> moments)
    {
        var rated = moments
            .Where(m => m.Experience.IsRateable && m.Score.Average is not null)
            .OrderByDescending(m => m.Score.Average)
            .ThenByDescending(m => m.Score.Count)
            .ThenBy(m => m.Experience.SharedAt)
            .ThenBy(m => m.Experience.Id)
            .ToList();
        return rated.Count == 0 ? null : rated[0];
    }
}
