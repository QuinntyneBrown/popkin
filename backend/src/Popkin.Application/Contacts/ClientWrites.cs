using Microsoft.EntityFrameworkCore;
using Popkin.Domain;

namespace Popkin.Application.Contacts;

/// <summary>A resend saves once (L2-123 AC4): the row an owner's write with this client id already made.</summary>
public static class ClientWrites
{
    public static Task<T?> FindAsync<T>(IQueryable<T> rows, Guid ownerId, Guid clientId, CancellationToken cancellationToken)
        where T : class, IClientWrite =>
        rows.OwnedBy(ownerId).FirstOrDefaultAsync(r => r.ClientId == clientId, cancellationToken);
}
