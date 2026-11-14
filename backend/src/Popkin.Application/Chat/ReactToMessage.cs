using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>Adds the caller's emoji to a message (L2-024 AC2, AC4). Adding it twice adds it once.</summary>
public sealed record AddReactionCommand(Guid PopkinId, Guid ThreadId, Guid MessageId, string? Emoji) : IRequest<IReadOnlyList<ReactionDto>>;

/// <summary>Takes the caller's emoji off a message (L2-024 AC3). Taking it twice, or one never added, changes nothing.</summary>
public sealed record RemoveReactionCommand(Guid PopkinId, Guid ThreadId, Guid MessageId, string? Emoji) : IRequest<IReadOnlyList<ReactionDto>>;

public sealed class AddReactionCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock)
    : IRequestHandler<AddReactionCommand, IReadOnlyList<ReactionDto>>
{
    public async Task<IReadOnlyList<ReactionDto>> Handle(AddReactionCommand request, CancellationToken cancellationToken)
    {
        var target = await ReactionTargets.RequireAsync(db, guard, request.PopkinId, request.ThreadId, request.MessageId, request.Emoji, cancellationToken);
        if (!await ReactionTargets.ExistsAsync(db, target, cancellationToken))
        {
            db.MessageReactions.Add(MessageReaction.React(target.Message.Id, target.Membership.Id, target.Emoji, clock.GetUtcNow()));
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                // Two adds of one reaction raced and this one lost on the key: the reaction is there.
                if (!await ReactionTargets.ExistsAsync(db, target, cancellationToken))
                {
                    throw;
                }
            }
        }

        return await Reactions.OfAsync(db, target.Message.Id, cancellationToken);
    }
}

public sealed class RemoveReactionCommandHandler(IAppDbContext db, IMembershipGuard guard)
    : IRequestHandler<RemoveReactionCommand, IReadOnlyList<ReactionDto>>
{
    public async Task<IReadOnlyList<ReactionDto>> Handle(RemoveReactionCommand request, CancellationToken cancellationToken)
    {
        var target = await ReactionTargets.RequireAsync(db, guard, request.PopkinId, request.ThreadId, request.MessageId, request.Emoji, cancellationToken);
        var reaction = await db.MessageReactions.FirstOrDefaultAsync(
            r => r.MessageId == target.Message.Id && r.MembershipId == target.Membership.Id && r.Emoji == target.Emoji, cancellationToken);
        if (reaction is not null)
        {
            db.MessageReactions.Remove(reaction);
            await db.SaveChangesAsync(cancellationToken);
        }

        return await Reactions.OfAsync(db, target.Message.Id, cancellationToken);
    }
}

/// <summary>The message a member reacts to, with the thread it is in and the emoji they chose.</summary>
public sealed record ReactionTarget(PopkinSpace Popkin, Membership Membership, ChatThread Thread, Message Message, string Emoji);

public static class ReactionTargets
{
    /// <summary>
    /// A message a member may react to: in a thread they may read, sent by a member and not
    /// deleted, in a Popkin that has not wrapped up (L2-045 AC2).
    /// </summary>
    public static async Task<ReactionTarget> RequireAsync(
        IAppDbContext db, IMembershipGuard guard, Guid popkinId, Guid threadId, Guid messageId, string? emoji, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(popkinId, cancellationToken);
        var thread = await ChatThreads.RequireAsync(db, membership, threadId, cancellationToken);
        var message = await ChatThreads.RequireMessageAsync(db, thread, messageId, cancellationToken);
        if (popkin.Status == PopkinStatus.WrappedUp)
        {
            throw MembershipGuard.WrappedUp();
        }

        return new ReactionTarget(popkin, membership, thread, message, emoji ?? "");
    }

    public static Task<bool> ExistsAsync(IAppDbContext db, ReactionTarget target, CancellationToken cancellationToken) =>
        db.MessageReactions.AnyAsync(
            r => r.MessageId == target.Message.Id && r.MembershipId == target.Membership.Id && r.Emoji == target.Emoji, cancellationToken);
}
