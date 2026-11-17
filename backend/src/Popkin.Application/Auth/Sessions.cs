using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;

namespace Popkin.Application.Auth;

public sealed record SessionDto(Guid PersonId, string Name, string? PhotoUrl);

/// <summary>What a use of a session found: whether it is live, and the new expiry when it was renewed.</summary>
public sealed record SessionUse(bool Live, DateTimeOffset? RenewedUntil)
{
    public static readonly SessionUse Ended = new(false, null);
}

/// <summary>
/// A request on a session: live when not revoked, not expired and its person not deleted
/// (L2-050 AC3); a live session lasts the sign-in length from this use (L2-176 AC2).
/// </summary>
public sealed record UseSessionCommand(Guid SessionId, Guid PersonId) : IRequest<SessionUse>;

public sealed class UseSessionCommandHandler(IAppDbContext db, TimeProvider clock, ILimits limits) : IRequestHandler<UseSessionCommand, SessionUse>
{
    public async Task<SessionUse> Handle(UseSessionCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var session = await db.Sessions.FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken);
        if (session is null || session.PersonId != request.PersonId || !session.IsLive(now)
            || !await db.People.AnyAsync(p => p.Id == request.PersonId && p.DeletedAt == null, cancellationToken))
        {
            return SessionUse.Ended;
        }

        if (!session.Renew(now, limits.SessionLength))
        {
            return new SessionUse(true, null);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new SessionUse(true, session.ExpiresAt);
    }
}

/// <summary>The caller's id, name and photo (GET /api/auth/session).</summary>
public sealed record GetSessionQuery : IRequest<SessionDto>;

public sealed class GetSessionQueryHandler(IAppDbContext db, ICurrentPerson current, IPhotoStore photos) : IRequestHandler<GetSessionQuery, SessionDto>
{
    public async Task<SessionDto> Handle(GetSessionQuery request, CancellationToken cancellationToken)
    {
        var person = await db.People.AsNoTracking().SingleAsync(p => p.Id == current.PersonId, cancellationToken);
        return new SessionDto(person.Id, person.Name, Account.AccountDtos.PhotoUrl(person, photos));
    }
}
