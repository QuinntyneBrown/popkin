using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class StoryConfiguration : IEntityTypeConfiguration<Story>
{
    public void Configure(EntityTypeBuilder<Story> builder)
    {
        builder.ToTable("Stories");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Title).HasMaxLength(Story.MaxTitleLength).IsRequired();
        builder.Property(s => s.Column).HasConversion<string>().HasMaxLength(10);
        builder.Property(s => s.Tag).HasConversion<string>().HasMaxLength(10);
        builder.Ignore(s => s.PointsLeft);
        // A board lists a Popkin's stories by column, in the order they were placed (L2-068).
        builder.HasIndex(s => new { s.PopkinId, s.PlacedAt });
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(s => s.PopkinId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class PlanChangeConfiguration : IEntityTypeConfiguration<PlanChange>
{
    public void Configure(EntityTypeBuilder<PlanChange> builder)
    {
        builder.ToTable("PlanChanges");
        builder.HasKey(c => c.Id);
        // The burn-down reads a Popkin's changes in the order they were made (L2-071). The story is
        // not a key: the row outlives a deleted story.
        builder.HasIndex(c => new { c.PopkinId, c.At });
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(c => c.PopkinId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class SprintConfiguration : IEntityTypeConfiguration<Sprint>
{
    public void Configure(EntityTypeBuilder<Sprint> builder)
    {
        builder.ToTable("Sprints");
        // A Popkin has one sprint (L2-068).
        builder.HasKey(s => s.PopkinId);
        builder.Property(s => s.Name).HasMaxLength(40).IsRequired();
        builder.Ignore(s => s.LastDay);
        // Two changes to the plan at once cannot both be saved from the same version.
        builder.Property(s => s.Version).IsConcurrencyToken();
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(s => s.PopkinId).OnDelete(DeleteBehavior.Cascade);
    }
}
