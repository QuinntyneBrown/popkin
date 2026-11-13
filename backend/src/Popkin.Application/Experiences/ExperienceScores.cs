using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>Reads the group's score of experiences.</summary>
public static class ExperienceScores
{
    /// <summary>
    /// The score of each experience given. The database counts the ratings per star value, so no
    /// rating is read into memory. Something the group wants to do has no score, whatever ratings
    /// it took while it was something else.
    /// </summary>
    public static async Task<Func<Experience, ExperienceScore>> OfAsync(
        IAppDbContext db, IEnumerable<Experience> experiences, CancellationToken cancellationToken)
    {
        var ids = experiences.Where(e => e.IsRateable).Select(e => e.Id).ToList();
        var counts = await db.ExperienceRatings.AsNoTracking()
            .Where(r => ids.Contains(r.ExperienceId))
            .GroupBy(r => new { r.ExperienceId, r.Stars })
            .Select(g => new { g.Key.ExperienceId, g.Key.Stars, Count = g.Count() })
            .ToListAsync(cancellationToken);
        var scores = counts
            .GroupBy(c => c.ExperienceId)
            .ToDictionary(g => g.Key, g => ExperienceScore.Of(g.Select(c => (c.Stars, c.Count))));
        return experience => scores.GetValueOrDefault(experience.Id, ExperienceScore.None);
    }

    public static async Task<ExperienceScore> OfAsync(IAppDbContext db, Experience experience, CancellationToken cancellationToken) =>
        (await OfAsync(db, [experience], cancellationToken))(experience);
}
