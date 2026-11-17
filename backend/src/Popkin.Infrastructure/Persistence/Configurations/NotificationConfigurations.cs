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
