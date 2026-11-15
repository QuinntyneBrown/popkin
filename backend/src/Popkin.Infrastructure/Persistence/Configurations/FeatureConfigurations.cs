using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class FeatureSettingConfiguration : IEntityTypeConfiguration<FeatureSetting>
{
    public void Configure(EntityTypeBuilder<FeatureSetting> builder)
    {
        builder.ToTable("FeatureSettings");
        builder.HasKey(s => s.Feature);
        builder.Property(s => s.Feature).HasConversion<string>().HasMaxLength(32);
        builder.Property(s => s.Mode).HasConversion<string>().HasMaxLength(16);
        builder.Property(s => s.ChangedByName).HasMaxLength(100).IsRequired();
    }
}

public sealed class FeatureChosenPopkinConfiguration : IEntityTypeConfiguration<FeatureChosenPopkin>
{
    public void Configure(EntityTypeBuilder<FeatureChosenPopkin> builder)
    {
        builder.ToTable("FeatureChosenPopkins");
        builder.HasKey(c => new { c.Feature, c.PopkinId });
        builder.Property(c => c.Feature).HasConversion<string>().HasMaxLength(32);
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(c => c.PopkinId).OnDelete(DeleteBehavior.Cascade);
    }
}
