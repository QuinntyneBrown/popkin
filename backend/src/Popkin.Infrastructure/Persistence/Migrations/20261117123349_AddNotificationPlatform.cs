using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationPlatform : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificationPlatform",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmailPausedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    PausedByAdminId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PauseReason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    BundlingMinutes = table.Column<int>(type: "int", nullable: false),
                    DailyMost = table.Column<int>(type: "int", nullable: false),
                    QuietFrom = table.Column<TimeOnly>(type: "time", nullable: false),
                    QuietUntil = table.Column<TimeOnly>(type: "time", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationPlatform", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationPlatform");
        }
    }
}
