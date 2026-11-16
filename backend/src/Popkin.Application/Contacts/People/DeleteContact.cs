using MediatR;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Security;

namespace Popkin.Application.Contacts.People;

/// <summary>
/// Deletes one of the caller's contacts and every row kept about them, in one save, then their
/// files (L2-132). No Popkin, membership or person changes, and nobody is told (L2-122 AC3).
/// </summary>
public sealed record DeleteContactCommand(Guid ContactId) : IRequest;

public sealed class DeleteContactCommandHandler(
    ContactsSwitch contacts,
    IContactGuard guard,
    IAppDbContext db,
    IPhotoStore photos,
    ILogger<DeleteContactCommandHandler> logger)
    : IRequestHandler<DeleteContactCommand>
{
    public async Task Handle(DeleteContactCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        var files = await ContactRemoval.RemoveAsync(
            db, db.Contacts.Where(c => c.Id == contact.Id), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        await ContactRemoval.DeleteFilesAsync(photos, files, logger);
    }
}
