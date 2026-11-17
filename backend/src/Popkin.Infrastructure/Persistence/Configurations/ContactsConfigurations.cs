using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class ContactConfiguration : IEntityTypeConfiguration<Contact>
{
    public void Configure(EntityTypeBuilder<Contact> builder)
    {
        builder.ToTable("Contacts");
        builder.HasKey(c => c.Id);
        // A resend saves once (L2-123 AC4).
        builder.HasIndex(c => new { c.OwnerId, c.ClientId }).IsUnique();
        builder.Property(c => c.Name).HasMaxLength(Contact.MaxNameLength).IsRequired();
        builder.Property(c => c.KnownAs).HasMaxLength(Contact.MaxKnownAsLength);
        builder.Property(c => c.City).HasMaxLength(Contact.MaxCityLength);
        builder.Property(c => c.HowWeMet).HasMaxLength(Contact.MaxHowWeMetLength);
        builder.Property(c => c.Phone).HasMaxLength(Contact.MaxPhoneLength);
        builder.Property(c => c.Email).HasMaxLength(Contact.MaxEmailLength);
        builder.Property(c => c.PhotoKey).HasMaxLength(200);
        builder.Property(c => c.Circle).HasConversion<string>().HasMaxLength(12);
        builder.PrimitiveCollection(c => c.Loves);
        // Who was imported, so Import offers them no more (L2-151 AC2).
        builder.HasIndex(c => new { c.OwnerId, c.PersonId });
        // A person's contacts go with their account (L2-049).
        builder.HasOne<Person>().WithMany().HasForeignKey(c => c.OwnerId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class KeyDateConfiguration : IEntityTypeConfiguration<KeyDate>
{
    public void Configure(EntityTypeBuilder<KeyDate> builder)
    {
        builder.ToTable("KeyDates");
        builder.HasKey(d => d.Id);
        // A resend saves once (L2-123 AC4).
        builder.HasIndex(d => new { d.OwnerId, d.ClientId }).IsUnique();
        builder.HasIndex(d => d.ContactId);
        builder.Property(d => d.Title).HasMaxLength(KeyDate.MaxTitleLength);
        builder.Property(d => d.Kind).HasConversion<string>().HasMaxLength(12);
        builder.Property(d => d.Lead).HasConversion<string>().HasMaxLength(16);
        builder.Property(d => d.RemindersOn).HasDefaultValue(true);
        // A date goes with its contact (L2-132); ContactRemoval removes it in the same save.
        builder.HasOne<Contact>().WithMany().HasForeignKey(d => d.ContactId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ReminderPreferencesConfiguration : IEntityTypeConfiguration<ReminderPreferences>
{
    public void Configure(EntityTypeBuilder<ReminderPreferences> builder)
    {
        builder.ToTable("ReminderPreferences");
        builder.HasKey(p => p.OwnerId);
        builder.Property(p => p.BirthdayLead).HasConversion<string>().HasMaxLength(16);
        builder.Property(p => p.AnniversaryLead).HasConversion<string>().HasMaxLength(16);
        builder.Property(p => p.MilestoneLead).HasConversion<string>().HasMaxLength(16);
        builder.HasOne<Person>().WithMany().HasForeignKey(p => p.OwnerId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class FollowUpConfiguration : IEntityTypeConfiguration<FollowUp>
{
    public void Configure(EntityTypeBuilder<FollowUp> builder)
    {
        builder.ToTable("FollowUps");
        builder.HasKey(f => f.Id);
        // A resend saves once (L2-123 AC4).
        builder.HasIndex(f => new { f.OwnerId, f.ClientId }).IsUnique();
        builder.HasIndex(f => f.ContactId);
        builder.Property(f => f.Text).HasMaxLength(FollowUp.MaxTextLength).IsRequired();
        builder.Property(f => f.PromisedVia).HasConversion<string>().HasMaxLength(12);
        // A follow-up goes with its account (L2-049) and with its contact (L2-132); ContactRemoval
        // removes it in the same save, so the database never cascades from two paths.
        builder.HasOne<Person>().WithMany().HasForeignKey(f => f.OwnerId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Contact>().WithMany().HasForeignKey(f => f.ContactId).OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class TimelineEntryConfiguration : IEntityTypeConfiguration<TimelineEntry>
{
    public void Configure(EntityTypeBuilder<TimelineEntry> builder)
    {
        builder.ToTable("TimelineEntries");
        builder.HasKey(e => e.Id);
        // A resend saves once (L2-123 AC4).
        builder.HasIndex(e => new { e.OwnerId, e.ClientId }).IsUnique();
        builder.HasIndex(e => e.ContactId);
        builder.Property(e => e.Kind).HasConversion<string>().HasMaxLength(12);
        builder.Property(e => e.Channel).HasConversion<string>().HasMaxLength(12);
        builder.Property(e => e.MilestoneKind).HasConversion<string>().HasMaxLength(16);
        builder.Property(e => e.Title).HasMaxLength(TimelineEntry.MaxTitleLength);
        builder.Property(e => e.Note).HasMaxLength(TimelineEntry.MaxNoteLength);
        // An entry goes with its account (L2-049) and with its contact (L2-132); ContactRemoval
        // removes it in the same save, so the database never cascades from two paths.
        builder.HasOne<Person>().WithMany().HasForeignKey(e => e.OwnerId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Contact>().WithMany().HasForeignKey(e => e.ContactId).OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class MemoryConfiguration : IEntityTypeConfiguration<Memory>
{
    public void Configure(EntityTypeBuilder<Memory> builder)
    {
        builder.ToTable("Memories");
        builder.HasKey(m => m.Id);
        // A resend saves once (L2-123 AC4).
        builder.HasIndex(m => new { m.OwnerId, m.ClientId }).IsUnique();
        builder.HasIndex(m => m.ContactId);
        builder.Property(m => m.Kind).HasConversion<string>().HasMaxLength(8);
        builder.Property(m => m.Caption).HasMaxLength(Memory.MaxCaptionLength);
        builder.Property(m => m.FileKey).HasMaxLength(200);
        builder.Property(m => m.ThumbnailKey).HasMaxLength(200);
        builder.Property(m => m.FileName).HasMaxLength(Memory.MaxFileNameLength);
        builder.Property(m => m.ContentType).HasMaxLength(100);
        builder.Property(m => m.Text).HasMaxLength(Memory.MaxNoteLength);
        // A memory goes with its account (L2-049) and with its contact (L2-132); ContactRemoval
        // removes it and its files in the same save, so the database never cascades from two paths.
        builder.HasOne<Person>().WithMany().HasForeignKey(m => m.OwnerId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Contact>().WithMany().HasForeignKey(m => m.ContactId).OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class HabitConfiguration : IEntityTypeConfiguration<Habit>
{
    public void Configure(EntityTypeBuilder<Habit> builder)
    {
        builder.ToTable("Habits");
        builder.HasKey(h => h.Id);
        // A resend saves once (L2-123 AC4).
        builder.HasIndex(h => new { h.OwnerId, h.ClientId }).IsUnique();
        builder.HasIndex(h => h.ContactId);
        builder.Property(h => h.What).HasMaxLength(Habit.MaxWhatLength).IsRequired();
        builder.Property(h => h.Rhythm).HasConversion<string>().HasMaxLength(16);
        builder.HasMany(h => h.Kept).WithOne().HasForeignKey(k => k.HabitId).OnDelete(DeleteBehavior.Cascade);
        // A habit goes with its account (L2-049) and with its contact (L2-132); ContactRemoval
        // removes it in the same save, so the database never cascades from two paths.
        builder.HasOne<Person>().WithMany().HasForeignKey(h => h.OwnerId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Contact>().WithMany().HasForeignKey(h => h.ContactId).OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class HabitKeptConfiguration : IEntityTypeConfiguration<HabitKept>
{
    public void Configure(EntityTypeBuilder<HabitKept> builder)
    {
        builder.ToTable("HabitKept");
        builder.HasKey(k => k.Id);
        // A resend of "We met up" saves once (L2-123 AC4).
        builder.HasIndex(k => new { k.HabitId, k.ClientId }).IsUnique();
    }
}

public sealed class ConnectionConfiguration : IEntityTypeConfiguration<Connection>
{
    public void Configure(EntityTypeBuilder<Connection> builder)
    {
        builder.ToTable("Connections");
        builder.HasKey(c => c.Id);
        // A resend saves once (L2-123 AC4); a pair is connected once, kept smaller id first (gap 109).
        builder.HasIndex(c => new { c.OwnerId, c.ClientId }).IsUnique();
        builder.HasIndex(c => new { c.OwnerId, c.ContactId, c.OtherContactId }).IsUnique();
        builder.HasIndex(c => c.OtherContactId);
        builder.Property(c => c.Kind).HasConversion<string>().HasMaxLength(16);
        builder.Property(c => c.Words).HasMaxLength(Connection.MaxWordsLength);
        // A connection goes with its account (L2-049) and with either contact (L2-132);
        // ContactRemoval removes it in the same save, so the database never cascades from two paths.
        builder.HasOne<Person>().WithMany().HasForeignKey(c => c.OwnerId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Contact>().WithMany().HasForeignKey(c => c.ContactId).OnDelete(DeleteBehavior.NoAction);
        builder.HasOne<Contact>().WithMany().HasForeignKey(c => c.OtherContactId).OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class ContactGroupConfiguration : IEntityTypeConfiguration<ContactGroup>
{
    public void Configure(EntityTypeBuilder<ContactGroup> builder)
    {
        builder.ToTable("ContactGroups");
        builder.HasKey(g => g.Id);
        // A resend saves once (L2-123 AC4).
        builder.HasIndex(g => new { g.OwnerId, g.ClientId }).IsUnique();
        builder.Property(g => g.Name).HasMaxLength(ContactGroup.MaxNameLength);
        builder.Property(g => g.Note).HasMaxLength(ContactGroup.MaxNoteLength);
        builder.Property(g => g.Kind).HasConversion<string>().HasMaxLength(16);
        builder.Ignore(g => g.Emoji);
        // A group goes with its account (L2-049); the Popkin it starts keeps going without it.
        builder.HasOne<Person>().WithMany().HasForeignKey(g => g.OwnerId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(g => g.Members).WithOne().HasForeignKey(m => m.GroupId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ContactGroupMemberConfiguration : IEntityTypeConfiguration<ContactGroupMember>
{
    public void Configure(EntityTypeBuilder<ContactGroupMember> builder)
    {
        builder.ToTable("ContactGroupMembers");
        builder.HasKey(m => new { m.GroupId, m.ContactId });
        builder.HasIndex(m => m.ContactId);
        // ContactRemoval removes a deleted contact's memberships; the group stays (L2-147 AC7).
        builder.HasOne<Contact>().WithMany().HasForeignKey(m => m.ContactId).OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class ImportBatchConfiguration : IEntityTypeConfiguration<ImportBatch>
{
    public void Configure(EntityTypeBuilder<ImportBatch> builder)
    {
        builder.ToTable("ImportBatches");
        builder.HasKey(b => b.Id);
        // A resend imports once (L2-123 AC4).
        builder.HasIndex(b => new { b.OwnerId, b.ClientId }).IsUnique();
        builder.HasOne<Person>().WithMany().HasForeignKey(b => b.OwnerId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ContactReminderConfiguration : IEntityTypeConfiguration<ContactReminder>
{
    public void Configure(EntityTypeBuilder<ContactReminder> builder)
    {
        builder.ToTable("ContactReminders");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Kind).HasConversion<string>().HasMaxLength(16);
        builder.Property(r => r.Words).HasMaxLength(ContactReminder.MaxWordsLength).IsRequired();
        builder.HasIndex(r => new { r.Kind, r.SubjectId, r.DueOn }).IsUnique();
        builder.HasIndex(r => new { r.OwnerId, r.DismissedAt });
        builder.HasIndex(r => r.ContactId);
        builder.HasOne<Person>().WithMany().HasForeignKey(r => r.OwnerId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class PushSubscriptionConfiguration : IEntityTypeConfiguration<PushSubscription>
{
    public void Configure(EntityTypeBuilder<PushSubscription> builder)
    {
        builder.ToTable("PushSubscriptions");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Endpoint).HasMaxLength(PushSubscription.MaxEndpointLength).IsRequired();
        builder.Property(s => s.P256dh).HasMaxLength(PushSubscription.MaxKeyLength).IsRequired();
        builder.Property(s => s.Auth).HasMaxLength(PushSubscription.MaxKeyLength).IsRequired();
        builder.HasIndex(s => s.Endpoint).IsUnique();
        builder.HasIndex(s => s.PersonId);
        builder.HasOne<Person>().WithMany().HasForeignKey(s => s.PersonId).OnDelete(DeleteBehavior.Cascade);
    }
}
