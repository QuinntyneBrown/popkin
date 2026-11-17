using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NotificationDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "BirthdayLead",
                table: "ReminderPreferences",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(16)",
                oldMaxLength: 16);

            migrationBuilder.AddColumn<string>(
                name: "BirthdayLead",
                table: "NotificationPlatform",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultFrequency",
                table: "NotificationPlatform",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "AsItHappens");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DefaultsChangedAt",
                table: "NotificationPlatform",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultsChangedByName",
                table: "NotificationPlatform",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            // A row saved before defaults existed keeps the first values (L2-173 AC2).
            migrationBuilder.Sql("UPDATE NotificationPlatform SET BirthdayLead = 'OneWeekBefore'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BirthdayLead",
                table: "NotificationPlatform");

            migrationBuilder.DropColumn(
                name: "DefaultFrequency",
                table: "NotificationPlatform");

            migrationBuilder.DropColumn(
                name: "DefaultsChangedAt",
                table: "NotificationPlatform");

            migrationBuilder.DropColumn(
                name: "DefaultsChangedByName",
                table: "NotificationPlatform");

            migrationBuilder.Sql("UPDATE ReminderPreferences SET BirthdayLead = 'OneWeekBefore' WHERE BirthdayLead IS NULL");

            migrationBuilder.AlterColumn<string>(
                name: "BirthdayLead",
                table: "ReminderPreferences",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(16)",
                oldMaxLength: 16,
                oldNullable: true);
        }
    }
}
