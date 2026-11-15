using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlanChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PopkinId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Delta = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlanChanges_Popkins_PopkinId",
                        column: x => x.PopkinId,
                        principalTable: "Popkins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Sprints",
                columns: table => new
                {
                    PopkinId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FirstDay = table.Column<DateOnly>(type: "date", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sprints", x => x.PopkinId);
                    table.ForeignKey(
                        name: "FK_Sprints_Popkins_PopkinId",
                        column: x => x.PopkinId,
                        principalTable: "Popkins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Stories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PopkinId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Column = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Points = table.Column<int>(type: "int", nullable: false),
                    Tag = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    OwnerMembershipId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    AddedByMembershipId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    PlacedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Stories_Popkins_PopkinId",
                        column: x => x.PopkinId,
                        principalTable: "Popkins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlanChanges_PopkinId_At",
                table: "PlanChanges",
                columns: new[] { "PopkinId", "At" });

            migrationBuilder.CreateIndex(
                name: "IX_Stories_PopkinId_PlacedAt",
                table: "Stories",
                columns: new[] { "PopkinId", "PlacedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlanChanges");

            migrationBuilder.DropTable(
                name: "Sprints");

            migrationBuilder.DropTable(
                name: "Stories");
        }
    }
}
