using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class AdminConfiguration : IEntityTypeConfiguration<Admin>
{
    public void Configure(EntityTypeBuilder<Admin> builder)
    {
        builder.ToTable("Admins");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Email).HasMaxLength(254).IsRequired();
        builder.HasIndex(a => a.Email).IsUnique();
        builder.Property(a => a.Name).HasMaxLength(100).IsRequired();
        builder.Property(a => a.Role).HasConversion<string>().HasMaxLength(16);
        builder.Ignore(a => a.IsRemoved);
    }
}
