using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>The member's stars as they now stand, and the group's score with them counted.</summary>
public sealed record RatingResultDto(int Stars, ExperienceScoreDto Score);

/// <summary>
/// Sets the caller's one rating of an experience, from one to five stars (L2-039). Repeating it
/// has the same effect; `Stars` is null when the request gave no whole number.
/// </summary>
public sealed record RateExperienceCommand(Guid PopkinId, Guid ExperienceId, int? Stars) : IRequest<RatingResultDto>;

public sealed class RateExperienceCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock)
    : IRequestHandler<RateExperienceCommand, RatingResultDto>
{
    public async Task<RatingResultDto> Handle(RateExperienceCommand request, CancellationToken cancellationToken)
    {
        // Nothing new is added to a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        if (request.Stars is not { } stars || !ExperienceRating.IsInRange(stars))
        {
            throw ProblemException.Invalid("stars_out_of_range", "A rating is one to five stars.", "stars");
        }

        var experience = await Experiences.RequireAsync(db.Experiences.AsNoTracking(), popkin.Id, request.ExperienceId, cancellationToken);
        if (!experience.IsRateable)
        {
            throw new ProblemException(409, "experience_not_rateable", "Something the group wants to do is not rated.");
        }

        var now = clock.GetUtcNow();
        if (await MyRatings.FindAsync(db, experience.Id, membership.Id, cancellationToken) is { } rating)
        {
            // The member has rated: their rating changes and the count stays the same (L2-039 AC3).
            rating.ChangeStars(stars, now);
            await db.SaveChangesAsync(cancellationToken);
        }
        else
        {
            var first = experience.Rate(membership.Id, stars, now);
            db.ExperienceRatings.Add(first);
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                // Two first ratings of one member raced and this one lost on the key: the rating
                // that won is the member's one rating, and this choice, the later, changes it.
                db.ExperienceRatings.Remove(first);
                var winner = await MyRatings.FindAsync(db, experience.Id, membership.Id, cancellationToken);
                if (winner is null)
                {
                    throw;
                }

                winner.ChangeStars(stars, now);
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        return new RatingResultDto(stars, ExperienceScoreDto.Of(await ExperienceScores.OfAsync(db, experience, cancellationToken)));
    }
}

public static class MyRatings
{
    /// <summary>The member's rating of the experience, to change; null when they have not rated it.</summary>
    public static Task<ExperienceRating?> FindAsync(IAppDbContext db, Guid experienceId, Guid membershipId, CancellationToken cancellationToken) =>
        db.ExperienceRatings.FirstOrDefaultAsync(r => r.ExperienceId == experienceId && r.MembershipId == membershipId, cancellationToken);
}
