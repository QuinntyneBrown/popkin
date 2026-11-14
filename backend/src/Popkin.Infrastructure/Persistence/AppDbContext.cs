using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Person> People => Set<Person>();

    public DbSet<VerificationCode> VerificationCodes => Set<VerificationCode>();

    public DbSet<Session> Sessions => Set<Session>();

    public DbSet<PopkinSpace> Popkins => Set<PopkinSpace>();

    public DbSet<Membership> Memberships => Set<Membership>();

    public DbSet<ChatThread> ChatThreads => Set<ChatThread>();

    public DbSet<Message> Messages => Set<Message>();

    public DbSet<ThreadReadState> ThreadReadStates => Set<ThreadReadState>();

    public DbSet<Photo> Photos => Set<Photo>();

    public DbSet<Experience> Experiences => Set<Experience>();

    public DbSet<ExperienceRating> ExperienceRatings => Set<ExperienceRating>();

    public DbSet<ExperienceKeen> ExperienceKeens => Set<ExperienceKeen>();

    public DbSet<Call> Calls => Set<Call>();

    public DbSet<CallParticipant> CallParticipants => Set<CallParticipant>();

    public DbSet<AlbumExport> AlbumExports => Set<AlbumExport>();

    public DbSet<CrewInvite> CrewInvites => Set<CrewInvite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // SQLite cannot compare or order DateTimeOffset values; store them as sortable numbers
        // there so every query translates on both providers (ADR 0001).
        if (Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
        {
            configurationBuilder.Properties<DateTimeOffset>().HaveConversion<DateTimeOffsetToBinaryConverter>();
        }
    }
}
