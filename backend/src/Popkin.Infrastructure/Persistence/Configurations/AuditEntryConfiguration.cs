using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class AuditEntryConfiguration : IEntityTypeConfiguration<AuditEntry>
{
    public void Configure(EntityTypeBuilder<AuditEntry> builder)
    {
        builder.ToTable("AuditEntries");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedOnAdd();
        builder.Property(e => e.AdminName).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Action).HasConversion<string>().HasMaxLength(40);
        builder.Property(e => e.TargetKind).HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.TargetId).HasMaxLength(64).IsRequired();
        builder.Property(e => e.TargetName).HasMaxLength(200).IsRequired();
        builder.Property(e => e.Reason).HasMaxLength(500);
        builder.Property(e => e.Details).HasMaxLength(AuditEntry.MaxDetailsLength).IsRequired();
        builder.HasIndex(e => e.At);
        builder.HasIndex(e => new { e.AdminId, e.Id });
    }
}
