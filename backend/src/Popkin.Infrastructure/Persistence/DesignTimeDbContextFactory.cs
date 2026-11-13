using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Popkin.Infrastructure.Persistence;

/// <summary>
/// Lets `dotnet ef migrations add` build the model for SQL Server, the provider migrations are
/// for (ADR 0001). The connection string is never opened while adding a migration.
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=Popkin;Trusted_Connection=True")
            .Options);
}
