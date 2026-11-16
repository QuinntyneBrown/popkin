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

    DbSet<Message> Messages { get; }

    DbSet<MessageReaction> MessageReactions { get; }

    DbSet<ThreadReadState> ThreadReadStates { get; }

    DbSet<Photo> Photos { get; }

    DbSet<PhotoReaction> PhotoReactions { get; }

    DbSet<PhotoComment> PhotoComments { get; }

    DbSet<Experience> Experiences { get; }

    DbSet<ExperienceRating> ExperienceRatings { get; }

    DbSet<ExperienceKeen> ExperienceKeens { get; }

    DbSet<Call> Calls { get; }

    DbSet<CallParticipant> CallParticipants { get; }

    DbSet<AlbumExport> AlbumExports { get; }

    DbSet<CrewInvite> CrewInvites { get; }

    DbSet<TimeOffDay> TimeOffDays { get; }

    DbSet<Contact> Contacts { get; }

    DbSet<KeyDate> KeyDates { get; }

    DbSet<ReminderPreferences> ReminderPreferences { get; }

    DbSet<WorkingStretch> WorkingStretches { get; }

    DbSet<Admin> Admins { get; }

    DbSet<AdminSession> AdminSessions { get; }

    DbSet<AdminSignInLock> AdminSignInLocks { get; }

    DbSet<AuditEntry> AuditEntries { get; }

    DbSet<Story> Stories { get; }

    DbSet<Sprint> Sprints { get; }

    DbSet<PlanChange> PlanChanges { get; }

    DbSet<FeatureSetting> FeatureSettings { get; }

    DbSet<FeatureChosenPopkin> FeatureChosenPopkins { get; }

    DbSet<PopkinFeatureOff> PopkinFeaturesOff { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
