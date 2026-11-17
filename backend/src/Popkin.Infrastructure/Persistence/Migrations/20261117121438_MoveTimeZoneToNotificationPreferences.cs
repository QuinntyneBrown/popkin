using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MoveTimeZoneToNotificationPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TimeZone",
                table: "NotificationPreferences",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            // Each zone Contacts saved moves to the person's notification settings, so reminders
            // keep coming at the person's hour.
            migrationBuilder.Sql(
                """
                UPDATE n SET n.TimeZone = r.TimeZone
                FROM NotificationPreferences n
                JOIN ReminderPreferences r ON r.OwnerId = n.PersonId
                WHERE r.TimeZone IS NOT NULL;

                INSERT INTO NotificationPreferences (PersonId, EmailOn, Frequency, TimeZone, UpdatedAt)
                SELECT r.OwnerId, CAST(1 AS bit), NULL, r.TimeZone, NULL
                FROM ReminderPreferences r
                WHERE r.TimeZone IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM NotificationPreferences n WHERE n.PersonId = r.OwnerId);
                """);

            migrationBuilder.DropColumn(
                name: "TimeZone",
                table: "ReminderPreferences");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TimeZone",
                table: "ReminderPreferences",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE r SET r.TimeZone = n.TimeZone
                FROM ReminderPreferences r
                JOIN NotificationPreferences n ON n.PersonId = r.OwnerId;
                """);

            migrationBuilder.DropColumn(
                name: "TimeZone",
                table: "NotificationPreferences");
        }
    }
}
