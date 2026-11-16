using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Security;

/// <summary>
/// Loads a Contacts row for its owner alone (L2-122 AC1). Anything else, whether it is another
/// person's, deleted or never was, is the same `404` and names nothing of it.
/// </summary>
public interface IContactGuard
{
    Task<Contact> RequireOwnedAsync(Guid contactId, CancellationToken cancellationToken);
}

public sealed class ContactGuard(IAppDbContext db, ICurrentPerson current) : IContactGuard
{
    public static ProblemException NotFound() => new(404, "contact_not_found", "This person isn't in your Contacts.");

    public async Task<Contact> RequireOwnedAsync(Guid contactId, CancellationToken cancellationToken) =>
        await db.Contacts.OwnedBy(current.PersonId).FirstOrDefaultAsync(c => c.Id == contactId, cancellationToken)
        ?? throw NotFound();
}
