using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Chat;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>Gives the photo the caller's emoji (L2-034 AC2). Giving it twice gives it once.</summary>
public sealed record AddPhotoReactionCommand(Guid PopkinId, Guid PhotoId, string? Emoji) : IRequest<IReadOnlyList<PhotoReactionDto>>;

/// <summary>Takes the caller's emoji off the photo (L2-034 AC3). Taking it twice, or one never given, changes nothing.</summary>
public sealed record RemovePhotoReactionCommand(Guid PopkinId, Guid PhotoId, string? Emoji) : IRequest<IReadOnlyList<PhotoReactionDto>>;

public sealed class AddPhotoReactionCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock)
    : IRequestHandler<AddPhotoReactionCommand, IReadOnlyList<PhotoReactionDto>>
{
    public async Task<IReadOnlyList<PhotoReactionDto>> Handle(AddPhotoReactionCommand request, CancellationToken cancellationToken)
    {
        var (target, emoji) = await PhotoReactions.RequireAsync(db, guard, request.PopkinId, request.PhotoId, request.Emoji, cancellationToken);
        if (await PhotoReactions.FindAsync(db, target, emoji, cancellationToken) is null)
        {
            var reaction = PhotoReaction.React(target.Photo.Id, target.Membership.Id, emoji, clock.GetUtcNow());
            db.PhotoReactions.Add(reaction);
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                // The same reaction was given at the same moment: it is there, given once.
                db.PhotoReactions.Entry(reaction).State = EntityState.Detached;
            }
        }

        return await PhotoReactions.OfAsync(db, target.Photo.Id, target.Membership.Id, cancellationToken);
    }
}

public sealed class RemovePhotoReactionCommandHandler(IAppDbContext db, IMembershipGuard guard)
    : IRequestHandler<RemovePhotoReactionCommand, IReadOnlyList<PhotoReactionDto>>
{
    public async Task<IReadOnlyList<PhotoReactionDto>> Handle(RemovePhotoReactionCommand request, CancellationToken cancellationToken)
    {
        var (target, emoji) = await PhotoReactions.RequireAsync(db, guard, request.PopkinId, request.PhotoId, request.Emoji, cancellationToken);
        if (await PhotoReactions.FindAsync(db, target, emoji, cancellationToken) is { } reaction)
        {
            db.PhotoReactions.Remove(reaction);
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                // It was taken away at the same moment: it is gone either way.
                db.PhotoReactions.Entry(reaction).State = EntityState.Detached;
            }
        }

        return await PhotoReactions.OfAsync(db, target.Photo.Id, target.Membership.Id, cancellationToken);
    }
}

public static class PhotoReactions
{
    /// <summary>
    /// A photo the member may see, the emoji they chose, and a Popkin that has not wrapped up
    /// (L2-045 AC2). The emoji is one emoji, as chat's reactions are; anything else is 400
    /// `emoji_not_allowed` (L2-052 AC1).
    /// </summary>
    public static async Task<(PhotoInReach Target, string Emoji)> RequireAsync(
        IAppDbContext db, IMembershipGuard guard, Guid popkinId, Guid photoId, string? emoji, CancellationToken cancellationToken)
    {
        var target = await PhotoAccess.RequireAsync(db, guard, popkinId, photoId, cancellationToken);
        if (!ReactionValidator.IsEmoji(emoji))
        {
            throw ProblemException.Invalid("emoji_not_allowed", "A reaction is one emoji.", "emoji");
        }

        PhotoAccess.RequireActive(target);
        return (target, emoji!);
    }

    public static Task<PhotoReaction?> FindAsync(IAppDbContext db, PhotoInReach target, string emoji, CancellationToken cancellationToken) =>
        db.PhotoReactions.FirstOrDefaultAsync(
            r => r.PhotoId == target.Photo.Id && r.MembershipId == target.Membership.Id && r.Emoji == emoji, cancellationToken);

    /// <summary>
    /// The photo's reactions as the reader sees them: one per emoji in order of first use, ties to
    /// the ordinal order of the emoji, with how many gave it and whether the reader did.
    /// </summary>
    public static async Task<IReadOnlyList<PhotoReactionDto>> OfAsync(IAppDbContext db, Guid photoId, Guid readerMembershipId, CancellationToken cancellationToken)
    {
        var rows = await db.PhotoReactions.AsNoTracking().Where(r => r.PhotoId == photoId).ToListAsync(cancellationToken);
        return rows
            .GroupBy(r => r.Emoji, StringComparer.Ordinal)
            .OrderBy(g => g.Min(r => r.ReactedAt))
            .ThenBy(g => g.Key, StringComparer.Ordinal)
            .Select(g => new PhotoReactionDto(g.Key, g.Count(), g.Any(r => r.MembershipId == readerMembershipId)))
            .ToList();
    }
}
