using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPopkinFeaturesOff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PopkinFeaturesOff",
                columns: table => new
                {
                    PopkinId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Feature = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    SwitchedOffAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PopkinFeaturesOff", x => new { x.PopkinId, x.Feature });
                    table.ForeignKey(
                        name: "FK_PopkinFeaturesOff_Popkins_PopkinId",
                        column: x => x.PopkinId,
                        principalTable: "Popkins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PopkinFeaturesOff");
        }
    }
}
