using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Support;

/// <summary>Turns database faults on for a test.</summary>
public sealed class DatabaseFaults
{
    public bool FailSaves { get; set; }

    /// <summary>
    /// Makes the next save lose a race: the action stores the winner, then the save fails as a
    /// unique index would fail it. The InMemory provider has no unique index of its own.
    /// </summary>
    public Func<Task>? LoseNextSaveTo { get; set; }
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

    public DbSet<ThreadReadState> ThreadReadStates => inner.ThreadReadStates;

    public DbSet<Photo> Photos => inner.Photos;

    public DbSet<Call> Calls => inner.Calls;

    public DbSet<CallParticipant> CallParticipants => inner.CallParticipants;

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        if (faults.FailSaves)
        {
            throw new InvalidOperationException("Simulated database failure in table Popkins.");
        }

        if (faults.LoseNextSaveTo is { } winner)
        {
            faults.LoseNextSaveTo = null;
            await winner();
            throw new DbUpdateException("Simulated violation of a unique index.");
        }

        return await inner.SaveChangesAsync(cancellationToken);
    }
}
