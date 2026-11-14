using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>Who wrote a comment: a first name and an avatar, never a contact detail (L2-054 AC2).</summary>
public sealed record PhotoCommentAuthorDto(Guid MembershipId, string FirstName, AvatarDto Avatar);

/// <summary>A comment on a photo, as text that is never markup (L2-052 AC2), and whether the reader wrote it, so they may delete it.</summary>
public sealed record PhotoCommentDto(Guid Id, PhotoCommentAuthorDto Author, DateTimeOffset AddedAt, string Text, bool Mine)
{
    public static PhotoCommentDto Of(PhotoComment comment, Membership author, Guid readerMembershipId, IPhotoStore store) =>
        new(
            comment.Id,
            new PhotoCommentAuthorDto(author.Id, PersonName.FirstName(author.DisplayName), AvatarDto.Of(author, store)),
            comment.AddedAt,
            comment.Text,
            comment.AuthorMembershipId == readerMembershipId);
}

/// <summary>The comments of a photo the member may see, oldest first (L2-035 AC1); read in a wrapped-up Popkin too.</summary>
public sealed record GetPhotoCommentsQuery(Guid PopkinId, Guid PhotoId) : IRequest<IReadOnlyList<PhotoCommentDto>>;

/// <summary>Adds the caller's comment to a photo (L2-035 AC2, AC3).</summary>
public sealed record AddPhotoCommentCommand(Guid PopkinId, Guid PhotoId, string? Text) : IRequest<PhotoCommentDto>;

/// <summary>Deletes the caller's own comment on a photo (L2-035 AC5).</summary>
public sealed record DeletePhotoCommentCommand(Guid PopkinId, Guid PhotoId, Guid CommentId) : IRequest;

public sealed class GetPhotoCommentsQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store)
    : IRequestHandler<GetPhotoCommentsQuery, IReadOnlyList<PhotoCommentDto>>
{
    public async Task<IReadOnlyList<PhotoCommentDto>> Handle(GetPhotoCommentsQuery request, CancellationToken cancellationToken)
    {
        var target = await PhotoAccess.RequireAsync(db, guard, request.PopkinId, request.PhotoId, cancellationToken);
        var comments = await db.PhotoComments.AsNoTracking()
            .Where(c => c.PhotoId == target.Photo.Id)
            .OrderBy(c => c.AddedAt)
            .ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);
        var authorIds = comments.Select(c => c.AuthorMembershipId).Distinct().ToList();
        // A member who has left still wrote their comments.
        var authors = await db.Memberships.AsNoTracking().Where(m => authorIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
        return comments.Select(c => PhotoCommentDto.Of(c, authors[c.AuthorMembershipId], target.Membership.Id, store)).ToList();
    }
}

public sealed class AddPhotoCommentCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoStore store)
    : IRequestHandler<AddPhotoCommentCommand, PhotoCommentDto>
{
    public async Task<PhotoCommentDto> Handle(AddPhotoCommentCommand request, CancellationToken cancellationToken)
    {
        var target = await PhotoAccess.RequireAsync(db, guard, request.PopkinId, request.PhotoId, cancellationToken);
        var text = PhotoCommentText.Require(request.Text);
        // Nothing new is added to a Popkin that has wrapped up (L2-045 AC2).
        PhotoAccess.RequireActive(target);

        var comment = PhotoComment.Add(target.Photo.Id, target.Membership.Id, text, clock.GetUtcNow());
        db.PhotoComments.Add(comment);
        await db.SaveChangesAsync(cancellationToken);
        return PhotoCommentDto.Of(comment, target.Membership, target.Membership.Id, store);
    }
}

public sealed class DeletePhotoCommentCommandHandler(IAppDbContext db, IMembershipGuard guard) : IRequestHandler<DeletePhotoCommentCommand>
{
    public async Task Handle(DeletePhotoCommentCommand request, CancellationToken cancellationToken)
    {
        var target = await PhotoAccess.RequireAsync(db, guard, request.PopkinId, request.PhotoId, cancellationToken);
        var comment = await db.PhotoComments.FirstOrDefaultAsync(c => c.Id == request.CommentId && c.PhotoId == target.Photo.Id, cancellationToken)
            ?? throw new ProblemException(404, "comment_not_found", "This comment isn't here.");
        if (!comment.CanBeDeletedBy(target.Membership))
        {
            throw new ProblemException(403, "comment_not_yours", "Only the member who wrote this comment can delete it.");
        }

        PhotoAccess.RequireActive(target);
        db.PhotoComments.Remove(comment);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public static class PhotoCommentText
{
    /// <summary>
    /// The text as typed, less the white space around it: 1 to 500 characters (L2-035 AC3,
    /// L2-052 AC1); otherwise 400 `comment_empty` or `comment_too_long`, naming `text` and never
    /// repeating it (L2-054 AC3).
    /// </summary>
    public static string Require(string? text)
    {
        var trimmed = (text ?? "").Trim();
        if (trimmed.Length == 0)
        {
            throw ProblemException.Invalid("comment_empty", "Write something first.", "text");
        }

        return trimmed.Length <= PhotoComment.MaxTextLength
            ? trimmed
            : throw ProblemException.Invalid("comment_too_long", "A comment is at most 500 characters.", "text");
    }
}
