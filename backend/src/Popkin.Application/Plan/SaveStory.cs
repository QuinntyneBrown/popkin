using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Plan;

/// <summary>Any member saves a change to a story, under the rules of adding one (L2-070 AC3, AC8).</summary>
public sealed record SaveStoryCommand(
    Guid PopkinId, Guid StoryId, string? Title, string? Column, int? Points, Guid? OwnerMembershipId, string? Tag, string? DueDate)
    : IRequest<StoryDto>;

public sealed class SaveStoryCommandHandler(
    IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPopkinNotifier notifier, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<SaveStoryCommand, StoryDto>
{
    public async Task<StoryDto> Handle(SaveStoryCommand request, CancellationToken cancellationToken)
    {
        features.Require(Feature.Plan, request.PopkinId);
        // A wrapped-up Popkin's plan is read only (L2-070 AC7).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        var title = StoryFields.Title(request.Title);
        var column = StoryFields.Column(request.Column);
        var points = StoryFields.Points(request.Points);
        var tag = StoryFields.Tag(request.Tag);
        var due = StoryFields.DueDate(request.DueDate);
        var owner = await StoryFields.OwnerAsync(db, popkin.Id, request.OwnerMembershipId, cancellationToken);
        var story = await PlanStories.RequireAsync(db, popkin.Id, request.StoryId, cancellationToken);
        var sprint = await db.Sprints.SingleAsync(s => s.PopkinId == popkin.Id, cancellationToken);

        var before = story.PointsLeft;
        var (columnFrom, ownerFrom, dueFrom) = (story.Column, story.OwnerMembershipId, story.DueDate);
        var now = clock.GetUtcNow();
        story.Change(title, column, points, tag, owner, due, now);
        PlanStories.Record(db, story, before, now);
        await PlanNotifications.RecordAsync(
            db,
            story,
            membership,
            now,
            ownerFrom,
            new { columnFrom = columnFrom.ToString(), columnTo = story.Column.ToString(), ownerFrom, ownerTo = story.OwnerMembershipId, dueFrom, dueTo = story.DueDate },
            cancellationToken);
        sprint.Changed();
        await db.SaveChangesAsync(cancellationToken);
        await notifier.PlanChanged(popkin.Id, sprint.Version);

        var owners = await PlanStories.OwnersAsync(db, [story], cancellationToken);
        return PlanStories.Of(story, owners, membership, photos);
    }
}
