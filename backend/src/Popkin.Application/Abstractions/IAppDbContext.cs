namespace Popkin.Application.Abstractions;

/// <summary>The database as handlers see it. Tests inject database faults through it.</summary>
public interface IAppDbContext
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
