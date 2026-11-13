using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Security;

/// <summary>
/// Membership decides everything a person sees (docs/detailed-designs/security/membership-authorisation).
/// Anyone else gets 404 `popkin_not_found`, so a Popkin's existence is never disclosed (L2-051).
/// </summary>
public interface IMembershipGuard
{
    Task<(PopkinSpace Popkin, Membership Membership)> RequireMemberAsync(Guid popkinId, CancellationToken cancellationToken);

    /// <summary>A member of an active Popkin; a wrapped-up one is 409 `popkin_wrapped_up`.</summary>
    Task<(PopkinSpace Popkin, Membership Membership)> RequireActiveMemberAsync(Guid popkinId, CancellationToken cancellationToken);

    /// <summary>The Host; another member is 403 `host_only`.</summary>
    Task<(PopkinSpace Popkin, Membership Membership)> RequireHostAsync(Guid popkinId, CancellationToken cancellationToken);
}

public sealed class MembershipGuard(IAppDbContext db, ICurrentPerson current) : IMembershipGuard
{
    public static ProblemException NotFound() => new(404, "popkin_not_found", "This Popkin isn't here.");

    public static ProblemException WrappedUp() => new(409, "popkin_wrapped_up", "This Popkin has wrapped up.");

    public async Task<(PopkinSpace Popkin, Membership Membership)> RequireMemberAsync(Guid popkinId, CancellationToken cancellationToken)
    {
        var membership = await db.Memberships.FirstOrDefaultAsync(
            m => m.PopkinId == popkinId && m.PersonId == current.PersonId && m.LeftAt == null, cancellationToken)
            ?? throw NotFound();
        var popkin = await db.Popkins.FirstAsync(p => p.Id == popkinId, cancellationToken);
        return (popkin, membership);
    }

    public async Task<(PopkinSpace Popkin, Membership Membership)> RequireActiveMemberAsync(Guid popkinId, CancellationToken cancellationToken)
    {
        var found = await RequireMemberAsync(popkinId, cancellationToken);
        if (found.Popkin.Status == PopkinStatus.WrappedUp)
        {
            throw WrappedUp();
        }

        return found;
    }

    public async Task<(PopkinSpace Popkin, Membership Membership)> RequireHostAsync(Guid popkinId, CancellationToken cancellationToken)
    {
        var found = await RequireActiveMemberAsync(popkinId, cancellationToken);
        if (found.Membership.Role != MembershipRole.Host)
        {
            throw new ProblemException(403, "host_only", "Only the Host can do that.");
        }

        return found;
    }
}
