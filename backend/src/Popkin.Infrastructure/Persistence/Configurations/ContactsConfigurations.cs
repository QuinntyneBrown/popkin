using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class ContactConfiguration : IEntityTypeConfiguration<Contact>
{
    public void Configure(EntityTypeBuilder<Contact> builder)
    {
        builder.ToTable("Contacts");
        builder.HasKey(c => c.Id);
        // A resend saves once (L2-123 AC4).
        builder.HasIndex(c => new { c.OwnerId, c.ClientId }).IsUnique();
        builder.Property(c => c.Name).HasMaxLength(Contact.MaxNameLength).IsRequired();
        builder.Property(c => c.KnownAs).HasMaxLength(Contact.MaxKnownAsLength);
        builder.Property(c => c.City).HasMaxLength(Contact.MaxCityLength);
        builder.Property(c => c.HowWeMet).HasMaxLength(Contact.MaxHowWeMetLength);
        builder.Property(c => c.Phone).HasMaxLength(Contact.MaxPhoneLength);
        builder.Property(c => c.Email).HasMaxLength(Contact.MaxEmailLength);
        builder.Property(c => c.PhotoKey).HasMaxLength(200);
        builder.Property(c => c.Circle).HasConversion<string>().HasMaxLength(12);
        builder.PrimitiveCollection(c => c.Loves);
        // A person's contacts go with their account (L2-049).
        builder.HasOne<Person>().WithMany().HasForeignKey(c => c.OwnerId).OnDelete(DeleteBehavior.Cascade);
    }
}
