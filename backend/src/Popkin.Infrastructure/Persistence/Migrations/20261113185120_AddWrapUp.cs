using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWrapUp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PhotosRemovedAt",
                table: "Popkins",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PhotosRemovedCount",
                table: "Popkins",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Version",
                table: "Popkins",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.CreateTable(
                name: "AlbumExports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PopkinId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedByMembershipId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    PhotosTotal = table.Column<int>(type: "int", nullable: false),
                    PhotosDone = table.Column<int>(type: "int", nullable: false),
                    StorageKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    RequestedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlbumExports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlbumExports_Memberships_RequestedByMembershipId",
                        column: x => x.RequestedByMembershipId,
                        principalTable: "Memberships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AlbumExports_Popkins_PopkinId",
                        column: x => x.PopkinId,
                        principalTable: "Popkins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CrewInvites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PopkinId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PersonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CrewInvites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CrewInvites_People_PersonId",
                        column: x => x.PersonId,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CrewInvites_Popkins_PopkinId",
                        column: x => x.PopkinId,
                        principalTable: "Popkins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Popkins_Status_EndsAt",
                table: "Popkins",
                columns: new[] { "Status", "EndsAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AlbumExports_PopkinId_Status",
                table: "AlbumExports",
                columns: new[] { "PopkinId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AlbumExports_RequestedByMembershipId",
                table: "AlbumExports",
                column: "RequestedByMembershipId");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumExports_Status_RequestedAt",
                table: "AlbumExports",
                columns: new[] { "Status", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CrewInvites_PersonId",
                table: "CrewInvites",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_CrewInvites_PopkinId_PersonId",
                table: "CrewInvites",
                columns: new[] { "PopkinId", "PersonId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AlbumExports");

            migrationBuilder.DropTable(
                name: "CrewInvites");

            migrationBuilder.DropIndex(
                name: "IX_Popkins_Status_EndsAt",
                table: "Popkins");

            migrationBuilder.DropColumn(
                name: "PhotosRemovedAt",
                table: "Popkins");

            migrationBuilder.DropColumn(
                name: "PhotosRemovedCount",
                table: "Popkins");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "Popkins");
        }
    }
}
