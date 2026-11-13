using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class AlbumExportConfiguration : IEntityTypeConfiguration<AlbumExport>
{
    public void Configure(EntityTypeBuilder<AlbumExport> builder)
    {
        builder.ToTable("AlbumExports");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Status).HasConversion<string>().HasMaxLength(10);
        builder.Property(e => e.StorageKey).HasMaxLength(200);
        // A member's request finds the Popkin's export; the Worker finds those that wait or have expired.
        builder.HasIndex(e => new { e.PopkinId, e.Status });
        builder.HasIndex(e => new { e.Status, e.RequestedAt });
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(e => e.PopkinId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(e => e.RequestedByMembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}
