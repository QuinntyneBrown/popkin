using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class PopkinSpaceConfiguration : IEntityTypeConfiguration<PopkinSpace>
{
    public void Configure(EntityTypeBuilder<PopkinSpace> builder)
    {
        builder.ToTable("Popkins");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).HasMaxLength(PopkinRules.MaxNameLength).IsRequired();
        builder.Property(p => p.Emoji).HasMaxLength(16).IsRequired();
        builder.Property(p => p.Colour).HasConversion<string>().HasMaxLength(10);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(10);
        builder.Property(p => p.InviteCode).HasMaxLength(64).IsRequired();
        builder.HasIndex(p => p.InviteCode).IsUnique();
        builder.HasOne<Person>().WithMany().HasForeignKey(p => p.HostPersonId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(p => p.Memberships).WithOne().HasForeignKey(m => m.PopkinId).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(p => p.Memberships).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public sealed class MembershipConfiguration : IEntityTypeConfiguration<Membership>
{
    public void Configure(EntityTypeBuilder<Membership> builder)
    {
        builder.ToTable("Memberships");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Role).HasConversion<string>().HasMaxLength(10);
        builder.Property(m => m.DisplayName).HasMaxLength(Person.MaxNameLength).IsRequired();
        builder.HasIndex(m => new { m.PopkinId, m.PersonId }).IsUnique();
        builder.HasIndex(m => m.PersonId);
        builder.HasOne<Person>().WithMany().HasForeignKey(m => m.PersonId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ChatThreadConfiguration : IEntityTypeConfiguration<ChatThread>
{
    public void Configure(EntityTypeBuilder<ChatThread> builder)
    {
        builder.ToTable("ChatThreads");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Kind).HasConversion<string>().HasMaxLength(10);
        builder.HasIndex(t => t.PopkinId);
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(t => t.PopkinId).OnDelete(DeleteBehavior.Cascade);
    }
}
