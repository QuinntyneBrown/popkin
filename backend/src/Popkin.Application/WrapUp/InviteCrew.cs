using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Popkins;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.WrapUp;

/// <summary>
/// "Pop up another with this crew" (L2-046 AC5): the Host of a new Popkin sends its invite to
/// every member of a wrapped-up Popkin they hosted, to the contact detail each signs in with.
/// A member who left, who has no account any more or who is in the new Popkin already is sent
/// nothing, and nobody is sent it twice.
/// </summary>
public sealed record InviteCrewCommand(Guid PopkinId, Guid? FromPopkinId) : IRequest;

public sealed class InviteCrewCommandHandler(
    IAppDbContext db, IMembershipGuard guard, TimeProvider clock, InviteLinkBuilder links, IEnumerable<ICrewInviteSender> senders)
    : IRequestHandler<InviteCrewCommand>
{
    public async Task Handle(InviteCrewCommand request, CancellationToken cancellationToken)
    {
        // Only the Host of both Popkins (L2-051 AC4): the new one, which is active, then the old one, which has wrapped up.
        var (popkin, host) = await guard.RequireHostAsync(request.PopkinId, cancellationToken);
        if (request.FromPopkinId is not { } fromPopkinId)
        {
            throw ProblemException.Invalid("validation_failed", "Say which Popkin's crew to invite.", "fromPopkinId");
        }

        var (from, _) = await guard.RequireWrappedUpHostAsync(fromPopkinId, cancellationToken);

        var crew = await db.People.AsNoTracking()
            .Where(p => p.DeletedAt == null && p.Id != host.PersonId)
            .Where(p => db.Memberships.Any(m => m.PopkinId == from.Id && m.PersonId == p.Id && m.LeftAt == null))
            .Where(p => !db.Memberships.Any(m => m.PopkinId == popkin.Id && m.PersonId == p.Id && m.LeftAt == null))
            .Where(p => !db.CrewInvites.Any(i => i.PopkinId == popkin.Id && i.PersonId == p.Id))
            .ToListAsync(cancellationToken);

        var invite = new CrewInviteMessage(popkin.Name, PersonName.FirstName(host.DisplayName), links.Build(popkin.InviteCode));
        var now = clock.GetUtcNow();
        foreach (var person in crew)
        {
            var (channel, destination) = person.Phone is { } phone ? (ContactChannel.Phone, phone) : (ContactChannel.Email, person.Email!);
            try
            {
                await senders.Single(s => s.Channel == channel).SendAsync(destination, invite, cancellationToken);
            }
            catch (CrewInviteNotSentException)
            {
                // Not recorded as sent, so it goes out when the Host asks again.
                continue;
            }

            db.CrewInvites.Add(CrewInvite.Sent(popkin.Id, person.Id, now));
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
