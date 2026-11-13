using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;

namespace Popkin.Application.Experiences;

/// <summary>Adds a few words to the caller's rating of an experience, or replaces the ones they had (L2-041).</summary>
public sealed record CommentOnExperienceCommand(Guid PopkinId, Guid ExperienceId, string? Text) : IRequest<ExperienceCommentDto>;

public sealed class CommentOnExperienceCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoStore store)
    : IRequestHandler<CommentOnExperienceCommand, ExperienceCommentDto>
{
    public async Task<ExperienceCommentDto> Handle(CommentOnExperienceCommand request, CancellationToken cancellationToken)
    {
        // Nothing new is added to a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        var text = ExperienceFields.Comment(request.Text);
        var experience = await Experiences.RequireAsync(db.Experiences, popkin.Id, request.ExperienceId, cancellationToken);
        // A comment belongs to a rating: it has no stars of its own. Something the group wants to do has no ratings.
        var rating = (experience.IsRateable ? await MyRatings.FindAsync(db, experience.Id, membership.Id, cancellationToken) : null)
            ?? throw new ProblemException(409, "rating_required", "Rate it first, then add a comment.");

        rating.SetComment(text, clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);

        return ExperienceCommentDto.Of(rating, membership, store);
    }
}
