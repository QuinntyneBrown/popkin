using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class TimeOffDayConfiguration : IEntityTypeConfiguration<TimeOffDay>
{
    public void Configure(EntityTypeBuilder<TimeOffDay> builder)
    {
        builder.ToTable("TimeOffDays");
        // One entry per member and day; Working has none (L2-072).
        builder.HasKey(d => new { d.MembershipId, d.Day });
        builder.Property(d => d.Kind).HasConversion<string>().HasMaxLength(10);
        // The entries go with their membership.
        builder.HasOne<Membership>().WithMany().HasForeignKey(d => d.MembershipId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class WorkingStretchConfiguration : IEntityTypeConfiguration<WorkingStretch>
{
    public void Configure(EntityTypeBuilder<WorkingStretch> builder)
    {
        builder.ToTable("WorkingStretches");
        // At most two stretches per member and day (L2-074 AC8).
        builder.HasKey(s => new { s.MembershipId, s.Day, s.Index });
        builder.Ignore(s => s.Stretch);
        // The stretches go with their membership.
        builder.HasOne<Membership>().WithMany().HasForeignKey(s => s.MembershipId).OnDelete(DeleteBehavior.Cascade);
    }
}
