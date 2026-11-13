using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class PersonConfiguration : IEntityTypeConfiguration<Person>
{
    public void Configure(EntityTypeBuilder<Person> builder)
    {
        builder.ToTable("People");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).HasMaxLength(Person.MaxNameLength).IsRequired();
        builder.Property(p => p.Phone).HasMaxLength(20);
        builder.Property(p => p.Email).HasMaxLength(254);
        builder.Property(p => p.PhotoKey).HasMaxLength(200);
        builder.HasIndex(p => p.Phone).IsUnique().HasFilter("[Phone] IS NOT NULL AND [DeletedAt] IS NULL");
        builder.HasIndex(p => p.Email).IsUnique().HasFilter("[Email] IS NOT NULL AND [DeletedAt] IS NULL");
    }
}
