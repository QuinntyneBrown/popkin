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

    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();

    public DbSet<ThreadReadState> ThreadReadStates => Set<ThreadReadState>();

    public DbSet<Photo> Photos => Set<Photo>();

    public DbSet<PhotoReaction> PhotoReactions => Set<PhotoReaction>();

    public DbSet<Experience> Experiences => Set<Experience>();

    public DbSet<ExperienceRating> ExperienceRatings => Set<ExperienceRating>();

    public DbSet<ExperienceKeen> ExperienceKeens => Set<ExperienceKeen>();

    public DbSet<Call> Calls => Set<Call>();

    public DbSet<CallParticipant> CallParticipants => Set<CallParticipant>();

    public DbSet<AlbumExport> AlbumExports => Set<AlbumExport>();

    public DbSet<CrewInvite> CrewInvites => Set<CrewInvite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // SQL Server's default collations hold many emoji equal to one another; a reaction's
        // emoji is part of its key, so it is compared code point by code point there. SQLite
        // already compares text in binary.
        if (Database.ProviderName == "Microsoft.EntityFrameworkCore.SqlServer")
        {
            modelBuilder.Entity<MessageReaction>().Property(r => r.Emoji).UseCollation("Latin1_General_100_BIN2");
        }
    }

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
