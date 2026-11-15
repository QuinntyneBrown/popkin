using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class AdminSignInLockConfiguration : IEntityTypeConfiguration<AdminSignInLock>
{
    public void Configure(EntityTypeBuilder<AdminSignInLock> builder)
    {
        builder.ToTable("AdminSignInLocks");
        builder.HasKey(l => l.Email);
        builder.Property(l => l.Email).HasMaxLength(254);
        builder.Ignore(l => l.TriesLeft);
    }
}
