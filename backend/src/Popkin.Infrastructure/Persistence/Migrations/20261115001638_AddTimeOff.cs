using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeOff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "EventFirstDay",
                table: "Popkins",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EventLabel",
                table: "Popkins",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "EventLastDay",
                table: "Popkins",
                type: "date",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TimeOffDays",
                columns: table => new
                {
                    MembershipId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Day = table.Column<DateOnly>(type: "date", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimeOffDays", x => new { x.MembershipId, x.Day });
                    table.ForeignKey(
                        name: "FK_TimeOffDays_Memberships_MembershipId",
                        column: x => x.MembershipId,
                        principalTable: "Memberships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TimeOffDays");

            migrationBuilder.DropColumn(
                name: "EventFirstDay",
                table: "Popkins");

            migrationBuilder.DropColumn(
                name: "EventLabel",
                table: "Popkins");

            migrationBuilder.DropColumn(
                name: "EventLastDay",
                table: "Popkins");
        }
    }
}
