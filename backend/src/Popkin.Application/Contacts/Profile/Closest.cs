using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Security;

namespace Popkin.Application.Contacts.Profile;

/// <summary>Puts one of the caller's contacts in Closest (L2-131 AC4).</summary>
public sealed record AddToClosestCommand(Guid ContactId) : IRequest;

/// <summary>Takes one of the caller's contacts out of Closest; their circle stays (L2-131 AC2).</summary>
public sealed record TakeOutOfClosestCommand(Guid ContactId) : IRequest;

public sealed class AddToClosestCommandHandler(ContactsSwitch contacts, IContactGuard guard, IAppDbContext db)
    : IRequestHandler<AddToClosestCommand>
{
    public async Task Handle(AddToClosestCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        (await guard.RequireOwnedAsync(request.ContactId, cancellationToken)).JoinClosest();
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class TakeOutOfClosestCommandHandler(ContactsSwitch contacts, IContactGuard guard, IAppDbContext db)
    : IRequestHandler<TakeOutOfClosestCommand>
{
    public async Task Handle(TakeOutOfClosestCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        (await guard.RequireOwnedAsync(request.ContactId, cancellationToken)).LeaveClosest();
        await db.SaveChangesAsync(cancellationToken);
    }
}
