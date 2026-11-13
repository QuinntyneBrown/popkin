using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Support;

/// <summary>Turns database faults on for a test.</summary>
public sealed class DatabaseFaults
{
    public bool FailSaves { get; set; }
}

/// <summary>The database as handlers see it, with faults a test can switch on (ADR 0005).</summary>
public sealed class FaultyDbContext(AppDbContext inner, DatabaseFaults faults) : IAppDbContext
{
    public DbSet<Person> People => inner.People;

    public DbSet<VerificationCode> VerificationCodes => inner.VerificationCodes;

    public DbSet<Session> Sessions => inner.Sessions;

    public DbSet<PopkinSpace> Popkins => inner.Popkins;

    public DbSet<Membership> Memberships => inner.Memberships;

    public DbSet<ChatThread> ChatThreads => inner.ChatThreads;

    public DbSet<Message> Messages => inner.Messages;

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        faults.FailSaves
            ? throw new InvalidOperationException("Simulated database failure in table Popkins.")
            : inner.SaveChangesAsync(cancellationToken);
}
