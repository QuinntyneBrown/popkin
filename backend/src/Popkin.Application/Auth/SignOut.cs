using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;

namespace Popkin.Application.Auth;

/// <summary>
/// Ends the caller's session on this device (L2-048 AC5). The session is checked on every
/// request, so its cookie stops working at once, wherever a copy of it is (L2-050 AC3).
/// </summary>
public sealed record SignOutCommand : IRequest;

public sealed class SignOutCommandHandler(IAppDbContext db, ICurrentPerson current, TimeProvider clock) : IRequestHandler<SignOutCommand>
{
    public async Task Handle(SignOutCommand request, CancellationToken cancellationToken)
    {
        var session = await db.Sessions.SingleAsync(s => s.Id == current.SessionId, cancellationToken);
        session.Revoke(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
    }
}
