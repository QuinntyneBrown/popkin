using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificationKindChoices",
                columns: table => new
                {
                    PersonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Email = table.Column<bool>(type: "bit", nullable: true),
                    Phone = table.Column<bool>(type: "bit", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationKindChoices", x => new { x.PersonId, x.Kind });
                    table.ForeignKey(
                        name: "FK_NotificationKindChoices_People_PersonId",
                        column: x => x.PersonId,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationPreferences",
                columns: table => new
                {
                    PersonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmailOn = table.Column<bool>(type: "bit", nullable: false),
                    Frequency = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationPreferences", x => x.PersonId);
                    table.ForeignKey(
                        name: "FK_NotificationPreferences_People_PersonId",
                        column: x => x.PersonId,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationKindChoices");

            migrationBuilder.DropTable(
                name: "NotificationPreferences");
        }
    }
}
