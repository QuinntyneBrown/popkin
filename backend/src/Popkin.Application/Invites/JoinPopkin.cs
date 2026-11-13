using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Photos;
using Popkin.Application.Problems;
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

public sealed class JoinPopkinCommandHandler(
    IAppDbContext db, ICurrentPerson current, TimeProvider clock, IPhotoProcessor processor, IPhotoStore photos)
    : IRequestHandler<JoinPopkinCommand, JoinResult>
{
    public const int NamedMembers = 2;

    /// <summary>A photo is at most 10 MB (L2-013 AC2).</summary>
    public const long MaxPhotoBytes = 10 * 1024 * 1024;

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

        var avatar = request.Photo is null ? null : await ReadAvatarAsync(request.Photo, cancellationToken);

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
        if (avatar is null)
        {
            await db.SaveChangesAsync(cancellationToken);
            return new JoinResult(Joined(popkin, membership, members), Created: true);
        }

        // The photo is not added to the album: it is kept under its own random key.
        var key = $"avatars/{Guid.NewGuid():N}{avatar.Extension}";
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

        return new JoinResult(Joined(popkin, membership, members), Created: true);
    }

    private async Task<ProcessedPhoto> ReadAvatarAsync(PhotoUpload upload, CancellationToken cancellationToken)
    {
        if (upload.Length > MaxPhotoBytes)
        {
            throw ProblemException.Invalid("photo_too_large", "A photo is at most 10 MB.", "photo");
        }

        using var buffer = new MemoryStream();
        await upload.Content.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var avatar = ImageSniffer.Sniff(bytes) is null ? null : processor.MakeAvatar(bytes);
        return avatar ?? throw ProblemException.Invalid("photo_type_not_allowed", "A photo must be a JPEG, PNG, WebP or HEIC image.", "photo");
    }

    private static JoinedDto Joined(PopkinSpace popkin, Membership joiner, List<Membership> members)
    {
        var others = members.Where(m => m.Id != joiner.Id).ToList();
        var named = others.Take(NamedMembers).Select(m => PersonName.FirstName(m.DisplayName)).ToList();
        return new JoinedDto(
            popkin.Id, joiner.Id, joiner.DisplayName, popkin.Name, popkin.Emoji, popkin.Colour, named, others.Count - named.Count);
    }
}
