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
        builder.Ignore(e => e.IsWanted);
        // Experiences are listed newest first.
        builder.HasIndex(e => new { e.PopkinId, e.SharedAt });
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(e => e.PopkinId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(e => e.SharerMembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ExperienceRatingConfiguration : IEntityTypeConfiguration<ExperienceRating>
{
    public void Configure(EntityTypeBuilder<ExperienceRating> builder)
    {
        builder.ToTable("ExperienceRatings", table => table.HasCheckConstraint("CK_ExperienceRatings_Stars", "[Stars] BETWEEN 1 AND 5"));
        // One rating per member and experience, even when two requests race (L2-039).
        builder.HasKey(r => new { r.ExperienceId, r.MembershipId });
        builder.Property(r => r.Comment).HasMaxLength(ExperienceRating.MaxCommentLength);
        // The ratings go with their experience.
        builder.HasOne<Experience>().WithMany().HasForeignKey(r => r.ExperienceId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(r => r.MembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ExperienceKeenConfiguration : IEntityTypeConfiguration<ExperienceKeen>
{
    public void Configure(EntityTypeBuilder<ExperienceKeen> builder)
    {
        builder.ToTable("ExperienceKeens");
        // One keen per member and experience, even when two requests race (L2-042).
        builder.HasKey(k => new { k.ExperienceId, k.MembershipId });
        // Who is keen is read the earliest first.
        builder.HasIndex(k => new { k.ExperienceId, k.At });
        // The keen go with their experience.
        builder.HasOne<Experience>().WithMany().HasForeignKey(k => k.ExperienceId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(k => k.MembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}
