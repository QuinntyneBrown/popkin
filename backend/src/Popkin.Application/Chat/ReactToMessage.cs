using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>Adds the caller's emoji to a message (L2-024 AC2, AC4). Adding it twice adds it once.</summary>
public sealed record AddReactionCommand(Guid PopkinId, Guid ThreadId, Guid MessageId, string? Emoji) : IRequest<MessageReactionsDto>;

/// <summary>Takes the caller's emoji off a message (L2-024 AC3). Taking it twice, or one never added, changes nothing.</summary>
public sealed record RemoveReactionCommand(Guid PopkinId, Guid ThreadId, Guid MessageId, string? Emoji) : IRequest<MessageReactionsDto>;

public sealed class AddReactionCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPopkinNotifier notifier)
    : IRequestHandler<AddReactionCommand, MessageReactionsDto>
{
    public async Task<MessageReactionsDto> Handle(AddReactionCommand request, CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            var target = await ReactionTargets.RequireAsync(db, guard, request.PopkinId, request.ThreadId, request.MessageId, request.Emoji, cancellationToken);
            if (await ReactionTargets.FindAsync(db, target, cancellationToken) is not null)
            {
                return await ReactionTargets.CurrentAsync(db, target, cancellationToken);
            }

            var reaction = MessageReaction.React(target.Message.Id, target.Membership.Id, target.Emoji, clock.GetUtcNow());
            db.MessageReactions.Add(reaction);
            target.Message.ReactionsChanged();
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException) when (attempt < ReactionTargets.Attempts)
            {
                // The message's reactions changed at the same moment, or this very reaction was
                // added: the change is made again on the message as it now stands.
                db.MessageReactions.Entry(reaction).State = EntityState.Detached;
                db.Messages.Entry(target.Message).State = EntityState.Detached;
                continue;
            }

            return await ReactionTargets.ToldAsync(db, notifier, target, cancellationToken);
        }
    }
}

public sealed class RemoveReactionCommandHandler(IAppDbContext db, IMembershipGuard guard, IPopkinNotifier notifier)
    : IRequestHandler<RemoveReactionCommand, MessageReactionsDto>
{
    public async Task<MessageReactionsDto> Handle(RemoveReactionCommand request, CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            var target = await ReactionTargets.RequireAsync(db, guard, request.PopkinId, request.ThreadId, request.MessageId, request.Emoji, cancellationToken);
            if (await ReactionTargets.FindAsync(db, target, cancellationToken) is not { } reaction)
            {
                return await ReactionTargets.CurrentAsync(db, target, cancellationToken);
            }

            db.MessageReactions.Remove(reaction);
            target.Message.ReactionsChanged();
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException) when (attempt < ReactionTargets.Attempts)
            {
                // The message's reactions changed at the same moment: taken away again on the message as it now stands.
                db.MessageReactions.Entry(reaction).State = EntityState.Detached;
                db.Messages.Entry(target.Message).State = EntityState.Detached;
                continue;
            }

            return await ReactionTargets.ToldAsync(db, notifier, target, cancellationToken);
        }
    }
}

/// <summary>The message a member reacts to, with the thread it is in and the emoji they chose.</summary>
public sealed record ReactionTarget(PopkinSpace Popkin, Membership Membership, ChatThread Thread, Message Message, string Emoji);

public static class ReactionTargets
{
    /// <summary>How many times a change to a message's reactions is made before a race fails it.</summary>
    public const int Attempts = 3;

    /// <summary>
    /// A message a member may react to: in a thread they may read, sent by a member and not
    /// deleted, in a Popkin that has not wrapped up (L2-045 AC2).
    /// </summary>
    public static async Task<ReactionTarget> RequireAsync(
        IAppDbContext db, IMembershipGuard guard, Guid popkinId, Guid threadId, Guid messageId, string? emoji, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(popkinId, cancellationToken);
        var thread = await ChatThreads.RequireAsync(db, membership, threadId, cancellationToken);
        var valid = ReactionValidator.Require(emoji);
        var message = await ChatThreads.RequireMessageAsync(db, thread, messageId, cancellationToken);
        if (popkin.Status == PopkinStatus.WrappedUp)
        {
            throw MembershipGuard.WrappedUp();
        }

        return new ReactionTarget(popkin, membership, thread, message, valid);
    }

    /// <summary>The message's summary at its version, as it stands.</summary>
    public static async Task<MessageReactionsDto> CurrentAsync(IAppDbContext db, ReactionTarget target, CancellationToken cancellationToken) =>
        new(target.Message.ReactionsVersion, await Reactions.OfAsync(db, target.Message.Id, cancellationToken));

    /// <summary>
    /// The message's summary after a change was saved, told to the thread's audience, so a
    /// direct message's reactions reach its two members alone (L2-023 AC3). A repeat that changed
    /// nothing is not told.
    /// </summary>
    public static async Task<MessageReactionsDto> ToldAsync(
        IAppDbContext db, IPopkinNotifier notifier, ReactionTarget target, CancellationToken cancellationToken)
    {
        var current = await CurrentAsync(db, target, cancellationToken);
        await notifier.ReactionsChanged(
            await ChatThreads.AudienceAsync(db, target.Thread, cancellationToken), target.Thread.Id, target.Message.Id, current.Version, current.Reactions);
        return current;
    }

    /// <summary>The member's reaction with that emoji to the message; null when they have none.</summary>
    public static Task<MessageReaction?> FindAsync(IAppDbContext db, ReactionTarget target, CancellationToken cancellationToken) =>
        db.MessageReactions.FirstOrDefaultAsync(
            r => r.MessageId == target.Message.Id && r.MembershipId == target.Membership.Id && r.Emoji == target.Emoji, cancellationToken);
}
