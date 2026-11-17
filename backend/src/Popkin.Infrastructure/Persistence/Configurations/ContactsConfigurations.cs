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
