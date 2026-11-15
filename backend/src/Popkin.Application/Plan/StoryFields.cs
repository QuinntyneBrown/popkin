using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Plan;

/// <summary>
/// The rules the fields of a story keep, for adding and for changing one (L2-069 AC4, AC8,
/// L2-070 AC3). The title is kept as typed, less the white space around it; it is never markup
/// (L2-052 AC2). A refusal is 400 with a `code` and names its field (L2-052 AC1).
/// </summary>
public static class StoryFields
{
    public static string Title(string? title)
    {
        var text = (title ?? "").Trim();
        if (text.Length == 0)
        {
            throw ProblemException.Invalid("title_required", "Give the story a title.", "title");
        }

        return text.Length <= Story.MaxTitleLength
            ? text
            : throw ProblemException.Invalid("title_too_long", "A title is at most 80 characters.", "title");
    }

    /// <summary>Any of the four columns, by its name.</summary>
    public static StoryColumn Column(string? column) =>
        Enum.TryParse<StoryColumn>(column, ignoreCase: false, out var value) && Enum.IsDefined(value) && column == value.ToString()
            ? value
            : throw ProblemException.Invalid("invalid_column", "Choose a column.", "column");

    /// <summary>A new story goes to Backlog or To do ("This sprint") (L2-069 AC1).</summary>
    public static StoryColumn NewColumn(string? column) => Column(column) is var value and (StoryColumn.Backlog or StoryColumn.ToDo)
        ? value
        : throw ProblemException.Invalid("invalid_column", "A new story goes to Backlog or To do.", "column");

    public static int Points(int? points) => points is { } value && Story.AllowedPoints.Contains(value)
        ? value
        : throw ProblemException.Invalid("invalid_points", "Choose 1, 2, 3, 5 or 8 points.", "points");

    public static StoryTag Tag(string? tag) =>
        Enum.TryParse<StoryTag>(tag, ignoreCase: false, out var value) && Enum.IsDefined(value) && tag == value.ToString()
            ? value
            : throw ProblemException.Invalid("invalid_tag", "Choose a tag.", "tag");

    /// <summary>Nobody, or someone who is still a member of the Popkin (L2-069 AC8).</summary>
    public static async Task<Guid?> OwnerAsync(IAppDbContext db, Guid popkinId, Guid? ownerMembershipId, CancellationToken cancellationToken)
    {
        if (ownerMembershipId is not { } id)
        {
            return null;
        }

        var member = await db.Memberships.AnyAsync(m => m.Id == id && m.PopkinId == popkinId && m.LeftAt == null, cancellationToken);
        return member ? id : throw ProblemException.Invalid("invalid_owner", "Choose someone in this Popkin.", "ownerMembershipId");
    }
}
