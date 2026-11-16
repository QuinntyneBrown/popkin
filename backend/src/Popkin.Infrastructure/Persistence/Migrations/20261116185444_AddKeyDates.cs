using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddKeyDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KeyDates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Day = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: true),
                    EveryYear = table.Column<bool>(type: "bit", nullable: false),
                    Lead = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KeyDates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KeyDates_Contacts_ContactId",
                        column: x => x.ContactId,
                        principalTable: "Contacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReminderPreferences",
                columns: table => new
                {
                    OwnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BirthdayLead = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    AnniversaryLead = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    MilestoneLead = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    PhoneNotifications = table.Column<bool>(type: "bit", nullable: false),
                    MondayEmail = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReminderPreferences", x => x.OwnerId);
                    table.ForeignKey(
                        name: "FK_ReminderPreferences_People_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KeyDates_ContactId",
                table: "KeyDates",
                column: "ContactId");

            migrationBuilder.CreateIndex(
                name: "IX_KeyDates_OwnerId_ClientId",
                table: "KeyDates",
                columns: new[] { "OwnerId", "ClientId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KeyDates");

            migrationBuilder.DropTable(
                name: "ReminderPreferences");
        }
    }
}
