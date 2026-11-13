using Microsoft.EntityFrameworkCore;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence;

/// <summary>
/// The local API's starting data: the cast of the mocks (docs/mocks/README.md). Idempotent: each
/// record is added only when it is missing, so the seed is safe to re-run.
/// </summary>
public static class Seeder
{
    public static async Task SeedAsync(AppDbContext db, TimeProvider clock, CancellationToken cancellationToken = default)
    {
        var now = clock.GetUtcNow();
        if (!await db.People.AnyAsync(p => p.Phone == "+14155550148", cancellationToken))
        {
            db.People.Add(Person.Create("Mara Okafor", ContactChannel.Phone, "+14155550148", now));
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
