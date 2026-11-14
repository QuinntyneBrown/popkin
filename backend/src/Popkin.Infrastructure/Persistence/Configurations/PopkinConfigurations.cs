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
        builder.Property(p => p.Length).HasConversion<string>().HasMaxLength(12);
        builder.Property(p => p.InviteCode).HasMaxLength(64).IsRequired();
        builder.HasIndex(p => p.InviteCode).IsUnique();
        // A counter the entity raises, not a `rowversion`, so SQL Server, SQLite and the tests'
        // InMemory provider all refuse the second of two wrap-ups alike.
        builder.Property(p => p.Version).IsConcurrencyToken();
        builder.Ignore(p => p.PhotosRemoveAt);
        // The Worker reads the active Popkins whose end date has passed (L2-044 AC1).
        builder.HasIndex(p => new { p.Status, p.EndsAt });
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
        builder.Property(m => m.PhotoKey).HasMaxLength(200);
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
        // One direct message per pair of members per Popkin: the pair is stored lowest first,
        // and two opens at the same moment cannot both be saved. Everyone names no pair.
        builder.HasIndex(t => new { t.PopkinId, t.MemberAId, t.MemberBId }).IsUnique().HasFilter("[Kind] = 'Direct'");
        // A member finds the direct messages they are the second of.
        builder.HasIndex(t => t.MemberBId);
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(t => t.PopkinId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(t => t.MemberAId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Membership>().WithMany().HasForeignKey(t => t.MemberBId).OnDelete(DeleteBehavior.Restrict);
    }
}
