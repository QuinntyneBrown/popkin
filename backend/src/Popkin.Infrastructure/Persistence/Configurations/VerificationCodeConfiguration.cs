using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class VerificationCodeConfiguration : IEntityTypeConfiguration<VerificationCode>
{
    public void Configure(EntityTypeBuilder<VerificationCode> builder)
    {
        builder.ToTable("VerificationCodes");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Channel).HasConversion<string>().HasMaxLength(10);
        builder.Property(c => c.Purpose).HasConversion<string>().HasMaxLength(10);
        builder.Property(c => c.Destination).HasMaxLength(254).IsRequired();
        builder.Property(c => c.CodeHash).HasMaxLength(64).IsRequired();
        // Two confirmations of one code cannot both consume it (L2-005 AC5).
        builder.Property(c => c.Attempts).IsConcurrencyToken();
        builder.Property(c => c.ConsumedAt).IsConcurrencyToken();
        builder.Ignore(c => c.ResendAvailableAt);
        builder.HasIndex(c => new { c.Destination, c.SentAt });
    }
}
