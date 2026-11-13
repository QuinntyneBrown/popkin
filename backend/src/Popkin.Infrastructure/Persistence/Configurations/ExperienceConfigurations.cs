using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class ExperienceConfiguration : IEntityTypeConfiguration<Experience>
{
    public void Configure(EntityTypeBuilder<Experience> builder)
    {
        builder.ToTable("Experiences");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Kind).HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.Title).HasMaxLength(Experience.MaxTitleLength).IsRequired();
        builder.Property(e => e.When).HasMaxLength(Experience.MaxWhenLength);
        builder.Property(e => e.Place).HasMaxLength(Experience.MaxPlaceLength);
        builder.Property(e => e.PictureKey).HasMaxLength(200);
        builder.Property(e => e.PictureThumbnailKey).HasMaxLength(200);
        builder.Ignore(e => e.Picture);
        builder.Ignore(e => e.IsRateable);
        // Experiences are listed newest first.
        builder.HasIndex(e => new { e.PopkinId, e.SharedAt });
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(e => e.PopkinId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(e => e.SharerMembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}
