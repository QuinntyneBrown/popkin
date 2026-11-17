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

    public DbSet<PhotoComment> PhotoComments => Set<PhotoComment>();

    public DbSet<Experience> Experiences => Set<Experience>();

    public DbSet<ExperienceRating> ExperienceRatings => Set<ExperienceRating>();

    public DbSet<ExperienceKeen> ExperienceKeens => Set<ExperienceKeen>();

    public DbSet<Call> Calls => Set<Call>();

    public DbSet<CallParticipant> CallParticipants => Set<CallParticipant>();

    public DbSet<AlbumExport> AlbumExports => Set<AlbumExport>();

    public DbSet<CrewInvite> CrewInvites => Set<CrewInvite>();

    public DbSet<TimeOffDay> TimeOffDays => Set<TimeOffDay>();

    public DbSet<Contact> Contacts => Set<Contact>();

    public DbSet<KeyDate> KeyDates => Set<KeyDate>();

    public DbSet<ReminderPreferences> ReminderPreferences => Set<ReminderPreferences>();

    public DbSet<FollowUp> FollowUps => Set<FollowUp>();

    public DbSet<TimelineEntry> TimelineEntries => Set<TimelineEntry>();

    public DbSet<Memory> Memories => Set<Memory>();

    public DbSet<Habit> Habits => Set<Habit>();

    public DbSet<HabitKept> HabitKept => Set<HabitKept>();

    public DbSet<Connection> Connections => Set<Connection>();

    public DbSet<ContactGroup> ContactGroups => Set<ContactGroup>();

    public DbSet<ImportBatch> ImportBatches => Set<ImportBatch>();

    public DbSet<ContactReminder> ContactReminders => Set<ContactReminder>();


    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();

    public DbSet<NotificationPreferences> NotificationPreferences => Set<NotificationPreferences>();

    public DbSet<NotificationKindChoice> NotificationKindChoices => Set<NotificationKindChoice>();

    public DbSet<PersonMute> PersonMutes => Set<PersonMute>();

    public DbSet<NotificationEvent> NotificationEvents => Set<NotificationEvent>();

    public DbSet<NotificationDelivery> NotificationDeliveries => Set<NotificationDelivery>();

    public DbSet<NotificationPlatform> NotificationPlatforms => Set<NotificationPlatform>();

    public DbSet<NotificationKindSwitch> NotificationKindSwitches => Set<NotificationKindSwitch>();

    public DbSet<NotificationHold> NotificationHolds => Set<NotificationHold>();

    public DbSet<OutgoingEmail> OutgoingEmails => Set<OutgoingEmail>();

    public DbSet<ContactGroupMember> ContactGroupMembers => Set<ContactGroupMember>();

    public DbSet<WorkingStretch> WorkingStretches => Set<WorkingStretch>();

    public DbSet<Admin> Admins => Set<Admin>();

    public DbSet<AdminSession> AdminSessions => Set<AdminSession>();

    public DbSet<AdminSignInLock> AdminSignInLocks => Set<AdminSignInLock>();

    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();

    public DbSet<Story> Stories => Set<Story>();

    public DbSet<Sprint> Sprints => Set<Sprint>();

    public DbSet<PlanChange> PlanChanges => Set<PlanChange>();

    public DbSet<FeatureSetting> FeatureSettings => Set<FeatureSetting>();

    public DbSet<FeatureChosenPopkin> FeatureChosenPopkins => Set<FeatureChosenPopkin>();

    public DbSet<PopkinFeatureOff> PopkinFeaturesOff => Set<PopkinFeatureOff>();

    /// <summary>The audit log cannot be edited, and an entry is deleted only at two years (L2-120 AC6).</summary>
    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries<AuditEntry>())
        {
            if (entry.State == EntityState.Modified
                || (entry.State == EntityState.Deleted && !entry.Entity.MayBeDeleted(now)))
            {
                throw new InvalidOperationException("An audit entry cannot be changed or deleted.");
            }
        }

        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

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
