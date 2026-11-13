using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Invites;

/// <summary>
/// What the welcome screen says: who joined, the Popkin's look, and two other members' first
/// names (the Host first) with the rest counted (L2-014 AC1).
/// </summary>
public sealed record JoinedDto(
    Guid PopkinId,
    Guid MembershipId,
    string DisplayName,
    string PopkinName,
    string Emoji,
    PopkinColour Colour,
    IReadOnlyList<string> NamedMembers,
    int OthersCount);

/// <summary>`Created` is false when the caller already belonged, so a retried join does not fail.</summary>
public sealed record JoinResult(JoinedDto Joined, bool Created);

/// <summary>Joins the Popkin behind an invite code under a display name (L2-013).</summary>
public sealed record JoinPopkinCommand(string Code, string? DisplayName) : IRequest<JoinResult>;

public sealed class JoinPopkinCommandHandler(IAppDbContext db, ICurrentPerson current, TimeProvider clock)
    : IRequestHandler<JoinPopkinCommand, JoinResult>
{
    public const int NamedMembers = 2;

    public async Task<JoinResult> Handle(JoinPopkinCommand request, CancellationToken cancellationToken)
    {
        var displayName = (request.DisplayName ?? "").Trim();
        if (displayName.Length == 0)
        {
            throw ProblemException.Invalid("display_name_required", "Enter a name so people know who you are.", "displayName");
        }

        if (displayName.Length > Person.MaxNameLength)
        {
            throw ProblemException.Invalid("display_name_too_long", "A name is at most 40 characters.", "displayName");
        }

        var popkin = await db.Popkins.FirstOrDefaultAsync(p => p.InviteCode == request.Code, cancellationToken)
            ?? throw InviteProblems.NotFound();
        var members = await InviteMembers.OfAsync(db, popkin, cancellationToken);
        if (members.FirstOrDefault(m => m.PersonId == current.PersonId) is { } existing)
        {
            return new JoinResult(Joined(popkin, existing, members), Created: false);
        }

        if (popkin.Status == PopkinStatus.WrappedUp)
        {
            throw InviteProblems.WrappedUp();
        }

        var membership = popkin.Join(current.PersonId, displayName, members[0].Id, clock.GetUtcNow());
        db.Memberships.Add(membership);
        await db.SaveChangesAsync(cancellationToken);
        return new JoinResult(Joined(popkin, membership, members), Created: true);
    }

    private static JoinedDto Joined(PopkinSpace popkin, Membership joiner, List<Membership> members)
    {
        var others = members.Where(m => m.Id != joiner.Id).ToList();
        var named = others.Take(NamedMembers).Select(m => PersonName.FirstName(m.DisplayName)).ToList();
        return new JoinedDto(
            popkin.Id, joiner.Id, joiner.DisplayName, popkin.Name, popkin.Emoji, popkin.Colour, named, others.Count - named.Count);
    }
}
