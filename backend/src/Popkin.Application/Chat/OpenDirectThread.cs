using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Realtime;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>`Created` is false when the two members had their direct message already.</summary>
public sealed record OpenDirectThreadResult(ThreadDto Thread, bool Created);

/// <summary>
/// Opens the direct message between the caller and another member of the same Popkin, named by
/// their membership id: the one the two have, or a new one (L2-023 AC1). It is safe to repeat.
/// </summary>
public sealed record OpenDirectThreadCommand(Guid PopkinId, Guid MemberId) : IRequest<OpenDirectThreadResult>;

public sealed class OpenDirectThreadCommandHandler(
    IAppDbContext db, IMembershipGuard guard, TimeProvider clock, PresenceTracker presence, IPhotoStore photos)
    : IRequestHandler<OpenDirectThreadCommand, OpenDirectThreadResult>
{
    public async Task<OpenDirectThreadResult> Handle(OpenDirectThreadCommand request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        if (request.MemberId == membership.Id)
        {
            throw ProblemException.Invalid("cannot_message_self", "A direct message is with another member.", "memberId");
        }

        // The other member is in this Popkin and has not left it: two people who share no
        // active Popkin cannot start a direct message (L2-023 AC4), and a membership of another
        // Popkin is not found here, the same as none (L2-051).
        var other = await db.Memberships.AsNoTracking().FirstOrDefaultAsync(
            m => m.Id == request.MemberId && m.PopkinId == popkin.Id && m.LeftAt == null, cancellationToken)
            ?? throw new ProblemException(404, "member_not_found", "This member isn't here.");

        if (await FindAsync(popkin.Id, membership.Id, other.Id, cancellationToken) is { } existing)
        {
            return new OpenDirectThreadResult(await DtoAsync(existing), Created: false);
        }

        // Nothing new is added to a Popkin that has wrapped up; a direct message it has stays readable (L2-023 AC5).
        if (popkin.Status == PopkinStatus.WrappedUp)
        {
            throw MembershipGuard.WrappedUp();
        }

        var thread = ChatThread.Direct(popkin.Id, membership.Id, other.Id, clock.GetUtcNow());
        db.ChatThreads.Add(thread);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Both members opened it at the same moment and this one lost on the unique index:
            // the winner's thread is the direct message.
            db.ChatThreads.Entry(thread).State = EntityState.Detached;
            var winner = await FindAsync(popkin.Id, membership.Id, other.Id, cancellationToken);
            if (winner is null)
            {
                throw;
            }

            return new OpenDirectThreadResult(await DtoAsync(winner), Created: false);
        }

        return new OpenDirectThreadResult(await DtoAsync(thread), Created: true);

        Task<ThreadDto> DtoAsync(ChatThread found) =>
            ThreadDto.OfAsync(db, presence, photos, popkin, membership, found, other, cancellationToken);
    }

    private Task<ChatThread?> FindAsync(Guid popkinId, Guid firstMembershipId, Guid secondMembershipId, CancellationToken cancellationToken)
    {
        var (lower, higher) = ChatThread.OrderedPair(firstMembershipId, secondMembershipId);
        return db.ChatThreads.AsNoTracking().FirstOrDefaultAsync(
            t => t.PopkinId == popkinId && t.Kind == ChatThreadKind.Direct && t.MemberAId == lower && t.MemberBId == higher,
            cancellationToken);
    }
}
