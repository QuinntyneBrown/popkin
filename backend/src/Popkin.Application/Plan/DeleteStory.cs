using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Plan;

/// <summary>Deletes a story, for the person who added it, its owner or the Host (L2-070 AC4).</summary>
public sealed record DeleteStoryCommand(Guid PopkinId, Guid StoryId) : IRequest;

public sealed class DeleteStoryCommandHandler(IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPopkinNotifier notifier, TimeProvider clock)
    : IRequestHandler<DeleteStoryCommand>
{
    public async Task Handle(DeleteStoryCommand request, CancellationToken cancellationToken)
    {
        features.Require(Feature.Plan, request.PopkinId);
        // A wrapped-up Popkin's plan is read only (L2-070 AC7).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        var story = await PlanStories.RequireAsync(db, popkin.Id, request.StoryId, cancellationToken);
        if (!PlanStories.MayDelete(story, membership))
        {
            throw new ProblemException(403, "not_your_story", "Only the person who added this story, its owner or the Host can delete it.");
        }

        var sprint = await db.Sprints.SingleAsync(s => s.PopkinId == popkin.Id, cancellationToken);
        db.Stories.Remove(story);
        // Its points leave the days from now on; the days before still count them.
        PlanStories.Record(db, story, story.PointsLeft, 0, clock.GetUtcNow());
        sprint.Changed();
        await db.SaveChangesAsync(cancellationToken);
        await notifier.PlanChanged(popkin.Id, sprint.Version);
    }
}
