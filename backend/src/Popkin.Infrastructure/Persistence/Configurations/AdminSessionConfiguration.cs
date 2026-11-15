using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class AdminSessionConfiguration : IEntityTypeConfiguration<AdminSession>
{
    public void Configure(EntityTypeBuilder<AdminSession> builder)
    {
        builder.ToTable("AdminSessions");
        builder.HasKey(s => s.Id);
        builder.HasIndex(s => s.AdminId);
        builder.HasOne<Admin>().WithMany().HasForeignKey(s => s.AdminId).OnDelete(DeleteBehavior.Cascade);
    }
}
