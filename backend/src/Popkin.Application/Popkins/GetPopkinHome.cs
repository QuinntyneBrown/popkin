using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Chat;
using Popkin.Application.Invites;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Popkins;

/// <summary>The member reading the Popkin home.</summary>
public sealed record PopkinViewerDto(Guid MembershipId, string FirstName);

/// <summary>
/// The header of the Popkin home: the Popkin's look, its end, how many members it has with the
/// first few as avatars, who is reading and how many messages are new to them, in Everyone and
/// in their direct messages of the Popkin (L2-019 AC1, AC7, L2-022 AC3); and, for the read-only states, when it wrapped up, whether its album is
/// kept, and when its photos go or went (L2-045).
/// </summary>
public sealed record PopkinHomeDto(
    Guid Id,
    string Name,
    string Emoji,
    PopkinColour Colour,
    PopkinStatus Status,
    DateTimeOffset? EndsAt,
    int MemberCount,
    IReadOnlyList<AvatarDto> Avatars,
    MembershipRole ViewerRole,
    PopkinViewerDto Viewer,
    int UnreadCount,
    DateTimeOffset? WrappedUpAt,
    bool KeepPhotos,
    DateTimeOffset? PhotosRemoveAt,
    DateTimeOffset? PhotosRemovedAt);

/// <summary>The header of a Popkin's home, for any of its members (L2-019, L2-051 AC1).</summary>
public sealed record GetPopkinHomeQuery(Guid PopkinId) : IRequest<PopkinHomeDto>;

public sealed class GetPopkinHomeQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore photos)
    : IRequestHandler<GetPopkinHomeQuery, PopkinHomeDto>
{
    /// <summary>The header shows up to four avatars (L2-019 AC1).</summary>
    public const int MaxAvatars = 4;

    public async Task<PopkinHomeDto> Handle(GetPopkinHomeQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var members = await InviteMembers.OfAsync(db, popkin, cancellationToken);
        var thread = await ChatThreads.EveryoneAsync(db, popkin.Id, cancellationToken);
        var unread = await ThreadUnread.OfAsync(db, thread.Id, membership.Id, cancellationToken);
        var direct = await DirectThreads.Of(db, [membership.Id]).Where(t => t.PopkinId == popkin.Id).Select(t => t.Id).ToListAsync(cancellationToken);
        var directUnread = direct.Count == 0 ? 0 : (await ThreadUnread.CountsAsync(db, direct, [membership.Id], cancellationToken)).Values.Sum();

        return new PopkinHomeDto(
            popkin.Id,
            popkin.Name,
            popkin.Emoji,
            popkin.Colour,
            popkin.Status,
            popkin.EndsAt,
            members.Count,
            members.Take(MaxAvatars).Select(m => AvatarDto.Of(m, photos)).ToList(),
            membership.Role,
            new PopkinViewerDto(membership.Id, PersonName.FirstName(membership.DisplayName)),
            unread.Count + directUnread,
            popkin.WrappedUpAt,
            popkin.KeepPhotos,
            popkin.PhotosRemoveAt,
            popkin.PhotosRemovedAt);
    }
}
