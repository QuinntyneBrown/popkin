using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhotosInChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Every photo stored before photos in chat was added to the album.
            migrationBuilder.AddColumn<bool>(
                name: "InAlbum",
                table: "Photos",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ThreadId",
                table: "Photos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PhotoId",
                table: "Messages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Messages_PhotoId",
                table: "Messages",
                column: "PhotoId",
                unique: true,
                filter: "[PhotoId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Messages_PhotoId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "InAlbum",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "ThreadId",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "PhotoId",
                table: "Messages");
        }
    }
}
