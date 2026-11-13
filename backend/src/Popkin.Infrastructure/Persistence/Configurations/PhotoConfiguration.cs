using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class PhotoConfiguration : IEntityTypeConfiguration<Photo>
{
    public void Configure(EntityTypeBuilder<Photo> builder)
    {
        builder.ToTable("Photos");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Caption).HasMaxLength(Photo.MaxCaptionLength);
        builder.Property(p => p.StorageKey).HasMaxLength(200).IsRequired();
        builder.Property(p => p.ThumbnailKey).HasMaxLength(200).IsRequired();
        builder.Property(p => p.ContentType).HasMaxLength(50).IsRequired();
        // The album is read by the time a photo was taken, then its id.
        builder.HasIndex(p => new { p.PopkinId, p.TakenAt, p.Id });
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(p => p.PopkinId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(p => p.UploaderMembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}
