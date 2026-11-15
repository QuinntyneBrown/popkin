using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Plan;

/// <summary>Any member adds a story to the plan board (L2-069).</summary>
public sealed record AddStoryCommand(Guid PopkinId, string? Title, string? Column, int? Points, Guid? OwnerMembershipId, string? Tag)
    : IRequest<StoryDto>;

public sealed class AddStoryCommandHandler(
    IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPopkinNotifier notifier, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<AddStoryCommand, StoryDto>
{
    public async Task<StoryDto> Handle(AddStoryCommand request, CancellationToken cancellationToken)
    {
        features.Require(Feature.Plan, request.PopkinId);
        // Nothing new is added to a Popkin that has wrapped up (L2-069 AC8).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        var title = StoryFields.Title(request.Title);
        var column = StoryFields.NewColumn(request.Column);
        var points = StoryFields.Points(request.Points);
        var tag = StoryFields.Tag(request.Tag);
        var owner = await StoryFields.OwnerAsync(db, popkin.Id, request.OwnerMembershipId, cancellationToken);
        var now = clock.GetUtcNow();

        // The first story starts the sprint, today (L2-068 AC13).
        var sprint = await db.Sprints.SingleOrDefaultAsync(s => s.PopkinId == popkin.Id, cancellationToken);
        if (sprint is null)
        {
            sprint = Sprint.Start(popkin.Id, PlanDays.DayOf(now));
            db.Sprints.Add(sprint);
        }
        else
        {
            sprint.Changed();
        }

        var story = Story.Add(popkin.Id, title, column, points, tag, owner, membership.Id, now);
        db.Stories.Add(story);
        PlanStories.Record(db, story, 0, now);
        await db.SaveChangesAsync(cancellationToken);
        await notifier.PlanChanged(popkin.Id, sprint.Version);

        var owners = await PlanStories.OwnersAsync(db, [story], cancellationToken);
        return PlanStories.Of(story, owners, membership, photos);
    }
}
