using Microsoft.EntityFrameworkCore;
using Popkin.Domain;

namespace Popkin.Application.Abstractions;

/// <summary>The database as handlers see it. Tests inject database faults through it.</summary>
public interface IAppDbContext
{
    DbSet<Person> People { get; }

    DbSet<VerificationCode> VerificationCodes { get; }

    DbSet<Session> Sessions { get; }

    DbSet<PopkinSpace> Popkins { get; }

    DbSet<Membership> Memberships { get; }

    DbSet<ChatThread> ChatThreads { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
