using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;

namespace Popkin.Application.Auth;

public sealed record SessionDto(Guid PersonId, string Name, string? PhotoUrl);

/// <summary>Whether a session is live: not revoked, not expired, its person not deleted (L2-050 AC3).</summary>
public sealed record ValidateSessionQuery(Guid SessionId, Guid PersonId) : IRequest<bool>;

public sealed class ValidateSessionQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ValidateSessionQuery, bool>
{
    public async Task<bool> Handle(ValidateSessionQuery request, CancellationToken cancellationToken)
    {
        var session = await db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken);
        if (session is null || session.PersonId != request.PersonId || !session.IsLive(clock.GetUtcNow()))
        {
            return false;
        }

        return await db.People.AnyAsync(p => p.Id == request.PersonId && p.DeletedAt == null, cancellationToken);
    }
}

/// <summary>The caller's id, name and photo (GET /api/auth/session).</summary>
public sealed record GetSessionQuery : IRequest<SessionDto>;

public sealed class GetSessionQueryHandler(IAppDbContext db, ICurrentPerson current) : IRequestHandler<GetSessionQuery, SessionDto>
{
    public async Task<SessionDto> Handle(GetSessionQuery request, CancellationToken cancellationToken)
    {
        var person = await db.People.AsNoTracking().SingleAsync(p => p.Id == current.PersonId, cancellationToken);
        return new SessionDto(person.Id, person.Name, null);
    }
}
