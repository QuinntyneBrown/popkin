using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Chat;
using Popkin.Application.Photos;
using Popkin.Application.Problems;
using Popkin.Application.Realtime;
using Popkin.Domain;

namespace Popkin.Application.Invites;

/// <summary>
/// What the welcome screen says: who joined, the Popkin's look, and two other members' first
/// names (the Host first) with the rest counted (L2-014 AC1).
/// </summary>
public sealed record JoinedDto(
    Guid PopkinId,
    Guid MembershipId,
    string DisplayName,
    string PopkinName,
    string Emoji,
    PopkinColour Colour,
    IReadOnlyList<string> NamedMembers,
    int OthersCount);

/// <summary>`Created` is false when the caller already belonged, so a retried join does not fail.</summary>
public sealed record JoinResult(JoinedDto Joined, bool Created);

/// <summary>An uploaded file: its bytes and how many there are, before anything is read.</summary>
public sealed record PhotoUpload(Stream Content, long Length);

/// <summary>Joins the Popkin behind an invite code under a display name and, when given, a photo (L2-013).</summary>
public sealed record JoinPopkinCommand(string Code, string? DisplayName, PhotoUpload? Photo = null) : IRequest<JoinResult>;

/// <summary>Who joined, as the members with Popkin open are told (the `MemberJoined` event).</summary>
public sealed record MemberJoinedDto(Guid MembershipId, string FirstName, AvatarDto Avatar);

public sealed class JoinPopkinCommandHandler(
    IAppDbContext db,
    ICurrentPerson current,
    TimeProvider clock,
    IPhotoProcessor processor,
    IPhotoStore photos,
    IPopkinNotifier notifier,
    IPopkinConnections connections,
    PresenceTracker presence)
    : IRequestHandler<JoinPopkinCommand, JoinResult>
{
    public const int NamedMembers = 2;

    /// <summary>A photo is at most 10 MB (L2-013 AC2).</summary>
    public const long MaxPhotoBytes = AvatarPhotos.MaxBytes;

    public async Task<JoinResult> Handle(JoinPopkinCommand request, CancellationToken cancellationToken)
    {
        var displayName = (request.DisplayName ?? "").Trim();
        if (displayName.Length == 0)
        {
            throw ProblemException.Invalid("display_name_required", "Enter a name so people know who you are.", "displayName");
        }

        if (displayName.Length > Person.MaxNameLength)
        {
            throw ProblemException.Invalid("display_name_too_long", "A name is at most 40 characters.", "displayName");
        }

        var avatar = request.Photo is null ? null : await AvatarPhotos.ReadAsync(request.Photo, processor, cancellationToken);

        var popkin = await db.Popkins.FirstOrDefaultAsync(p => p.InviteCode == request.Code, cancellationToken)
            ?? throw InviteProblems.NotFound();
        var members = await InviteMembers.OfAsync(db, popkin, cancellationToken);
        if (members.FirstOrDefault(m => m.PersonId == current.PersonId) is { } existing)
        {
            return new JoinResult(Joined(popkin, existing, members), Created: false);
        }

        if (popkin.Status == PopkinStatus.WrappedUp)
        {
            throw InviteProblems.WrappedUp();
        }

        var membership = popkin.Join(current.PersonId, displayName, members[0].Id, clock.GetUtcNow());
        db.Memberships.Add(membership);
        // Everyone is told in the thread they share, in the same unit of work as the joining
        // and at its time (L2-014 AC4). Only a new membership writes the note.
        var everyone = await ChatThreads.EveryoneAsync(db, popkin.Id, cancellationToken);
        var note = Message.PoppedIn(everyone.Id, membership);
        db.Messages.Add(note);
        if (avatar is null)
        {
            await db.SaveChangesAsync(cancellationToken);
            await AnnounceAsync(popkin, membership, note, cancellationToken);
            return new JoinResult(Joined(popkin, membership, members), Created: true);
        }

        // The photo is not added to the album: it is kept under its own random key.
        var key = AvatarPhotos.NewKey(avatar);
        await photos.SaveAsync(key, avatar.Content, avatar.ContentType, cancellationToken);
        membership.SetPhoto(key);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Nobody joined, so the file belongs to no one.
            await photos.DeleteAsync(key, CancellationToken.None);
            throw;
        }

        await AnnounceAsync(popkin, membership, note, cancellationToken);
        return new JoinResult(Joined(popkin, membership, members), Created: true);
    }

    /// <summary>
    /// After the save: the members are told who joined, as the group stood before the joiner
    /// was in it, so the joiner is not told of their own joining. Then the connections the
    /// joiner already holds start receiving the Popkin's events, the joiner is here now, and
    /// the note goes to everyone, the joiner included.
    /// </summary>
    private async Task AnnounceAsync(PopkinSpace popkin, Membership membership, Message note, CancellationToken cancellationToken)
    {
        var avatar = AvatarDto.Of(membership, photos);
        var held = presence.ConnectionsOf(membership.PersonId);
        await notifier.MemberJoined(popkin.Id, new MemberJoinedDto(membership.Id, PersonName.FirstName(membership.DisplayName), avatar));
        foreach (var connectionId in held)
        {
            await connections.AddToPopkinAsync(connectionId, popkin.Id, cancellationToken);
        }

        presence.Join(membership.PersonId, popkin.Id);
        await notifier.MessageAdded(popkin.Id, MessageDto.Of(note, membership, photos));
    }

    private static JoinedDto Joined(PopkinSpace popkin, Membership joiner, List<Membership> members)
    {
        var others = members.Where(m => m.Id != joiner.Id).ToList();
        var named = others.Take(NamedMembers).Select(m => PersonName.FirstName(m.DisplayName)).ToList();
        return new JoinedDto(
            popkin.Id, joiner.Id, joiner.DisplayName, popkin.Name, popkin.Emoji, popkin.Colour, named, others.Count - named.Count);
    }
}
