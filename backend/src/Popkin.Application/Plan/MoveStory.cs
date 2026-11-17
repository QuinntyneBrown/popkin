using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Plan;

/// <summary>Any member moves a story to another column: "Move to {next column}" or "Mark done" (L2-070 AC2).</summary>
public sealed record MoveStoryCommand(Guid PopkinId, Guid StoryId, string? Column) : IRequest<StoryDto>;

public sealed class MoveStoryCommandHandler(
    IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPopkinNotifier notifier, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<MoveStoryCommand, StoryDto>
{
    public async Task<StoryDto> Handle(MoveStoryCommand request, CancellationToken cancellationToken)
    {
        features.Require(Feature.Plan, request.PopkinId);
        // A wrapped-up Popkin's plan is read only (L2-070 AC7).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        var column = StoryFields.Column(request.Column);
        var story = await PlanStories.RequireAsync(db, popkin.Id, request.StoryId, cancellationToken);
        var sprint = await db.Sprints.SingleAsync(s => s.PopkinId == popkin.Id, cancellationToken);

        var before = story.PointsLeft;
        var columnFrom = story.Column;
        var now = clock.GetUtcNow();
        story.MoveTo(column, now);
        PlanStories.Record(db, story, before, now);
        await PlanNotifications.RecordAsync(
            db, story, membership, now, story.OwnerMembershipId, new { columnFrom = columnFrom.ToString(), columnTo = story.Column.ToString() }, cancellationToken);
        sprint.Changed();
        await db.SaveChangesAsync(cancellationToken);
        await notifier.PlanChanged(popkin.Id, sprint.Version);

        var owners = await PlanStories.OwnersAsync(db, [story], cancellationToken);
        return PlanStories.Of(story, owners, membership, photos);
    }
}
