using Popkin.Domain;

namespace Popkin.Application.Contacts;

/// <summary>Where every Contacts read starts: the rows of one owner only (L2-122).</summary>
public static class OwnedQueries
{
    public static IQueryable<T> OwnedBy<T>(this IQueryable<T> rows, Guid ownerId)
        where T : IOwnedByPerson =>
        rows.Where(r => r.OwnerId == ownerId);
}
