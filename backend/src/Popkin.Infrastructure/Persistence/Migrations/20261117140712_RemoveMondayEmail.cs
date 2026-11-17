using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveMondayEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // "Phone notifications" moves to the "Birthdays" kind of Notifications (L2-140, as
            // changed 17 November 2026): whoever switched it off keeps it off there.
            migrationBuilder.Sql(
                """
                MERGE NotificationKindChoices AS target
                USING (SELECT OwnerId FROM ReminderPreferences WHERE PhoneNotifications = 0) AS source
                ON target.PersonId = source.OwnerId AND target.Kind = 'Birthdays'
                WHEN MATCHED THEN UPDATE SET Phone = 0
                WHEN NOT MATCHED THEN INSERT (PersonId, Kind, Email, Phone) VALUES (source.OwnerId, 'Birthdays', NULL, 0);
                """);

            migrationBuilder.DropTable(
                name: "ContactWeeklyEmails");

            migrationBuilder.DropColumn(
                name: "MondayEmail",
                table: "ReminderPreferences");

            migrationBuilder.DropColumn(
                name: "PhoneNotifications",
                table: "ReminderPreferences");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MondayEmail",
                table: "ReminderPreferences",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "PhoneNotifications",
                table: "ReminderPreferences",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ContactWeeklyEmails",
                columns: table => new
                {
                    OwnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WeekOf = table.Column<DateOnly>(type: "date", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactWeeklyEmails", x => new { x.OwnerId, x.WeekOf });
                    table.ForeignKey(
                        name: "FK_ContactWeeklyEmails_People_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }
    }
}
