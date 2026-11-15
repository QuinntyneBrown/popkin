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
