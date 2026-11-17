using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class NotificationPreferencesConfiguration : IEntityTypeConfiguration<NotificationPreferences>
{
    public void Configure(EntityTypeBuilder<NotificationPreferences> builder)
    {
        builder.ToTable("NotificationPreferences");
        builder.HasKey(p => p.PersonId);
        builder.Property(p => p.Frequency).HasConversion<string>().HasMaxLength(16);
        builder.Property(p => p.TimeZone).HasMaxLength(64);
        builder.HasOne<Person>().WithMany().HasForeignKey(p => p.PersonId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class NotificationKindChoiceConfiguration : IEntityTypeConfiguration<NotificationKindChoice>
{
    public void Configure(EntityTypeBuilder<NotificationKindChoice> builder)
    {
        builder.ToTable("NotificationKindChoices");
        builder.HasKey(c => new { c.PersonId, c.Kind });
        builder.Property(c => c.Kind).HasConversion<string>().HasMaxLength(32);
        builder.HasOne<Person>().WithMany().HasForeignKey(c => c.PersonId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class NotificationEventConfiguration : IEntityTypeConfiguration<NotificationEvent>
{
    public void Configure(EntityTypeBuilder<NotificationEvent> builder)
    {
        builder.ToTable("NotificationEvents");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Kind).HasConversion<string>().HasMaxLength(32);
        builder.Property(e => e.Audience).HasConversion<string>().HasMaxLength(16);
        builder.Property(e => e.DedupKey).HasMaxLength(128);
        builder.Property(e => e.Facts).HasMaxLength(1024);
        // The dispatcher reads what is not yet dispatched, oldest first.
        builder.HasIndex(e => e.OccurredAt).HasFilter("[DispatchedAt] IS NULL");
        builder.HasIndex(e => e.DedupKey).IsUnique().HasFilter("[DedupKey] IS NOT NULL");
    }
}

public sealed class NotificationDeliveryConfiguration : IEntityTypeConfiguration<NotificationDelivery>
{
    public void Configure(EntityTypeBuilder<NotificationDelivery> builder)
    {
        builder.ToTable("NotificationDeliveries");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Channel).HasConversion<string>().HasMaxLength(16);
        builder.Property(d => d.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(d => d.Rule).HasConversion<string>().HasMaxLength(32);
        builder.HasIndex(d => new { d.EventId, d.PersonId, d.Channel }).IsUnique();
        builder.HasIndex(d => new { d.Channel, d.Status, d.SendAfter });
        builder.HasOne<NotificationEvent>().WithMany().HasForeignKey(d => d.EventId).OnDelete(DeleteBehavior.Cascade);
    }
}
