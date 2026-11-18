using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class HolidayCalendarConfiguration : IEntityTypeConfiguration<HolidayCalendar>
{
    public void Configure(EntityTypeBuilder<HolidayCalendar> builder)
    {
        builder.ToTable("HolidayCalendars");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Key).HasMaxLength(40).IsRequired();
        builder.Property(c => c.Name).HasMaxLength(HolidayCalendar.MaxNameLength).IsRequired();
        builder.Property(c => c.Holds).HasMaxLength(HolidayCalendar.MaxTextLength).IsRequired();
        builder.Property(c => c.HowSet).HasMaxLength(HolidayCalendar.MaxTextLength).IsRequired();
        builder.HasIndex(c => c.Key).IsUnique();
    }
}

public sealed class HolidayCalendarYearConfiguration : IEntityTypeConfiguration<HolidayCalendarYear>
{
    public void Configure(EntityTypeBuilder<HolidayCalendarYear> builder)
    {
        builder.ToTable("HolidayCalendarYears");
        builder.HasKey(y => new { y.CalendarId, y.Year });
        builder.Ignore(y => y.IsPublished);
        builder.HasOne<HolidayCalendar>().WithMany().HasForeignKey(y => y.CalendarId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class HolidayConfiguration : IEntityTypeConfiguration<Holiday>
{
    public void Configure(EntityTypeBuilder<Holiday> builder)
    {
        builder.ToTable("Holidays");
        builder.HasKey(h => h.Id);
        builder.Property(h => h.Name).HasMaxLength(Holiday.MaxNameLength).IsRequired();
        builder.Property(h => h.Note).HasMaxLength(Holiday.MaxNoteLength);
        builder.Property(h => h.Status).HasConversion<string>().HasMaxLength(10);
        builder.HasIndex(h => new { h.CalendarId, h.Year, h.Date });
        builder.HasOne<HolidayCalendar>().WithMany().HasForeignKey(h => h.CalendarId).OnDelete(DeleteBehavior.Cascade);
    }
}
