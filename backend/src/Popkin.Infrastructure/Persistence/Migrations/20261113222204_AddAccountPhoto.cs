using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountPhoto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PhotoId",
                table: "People");

            migrationBuilder.AddColumn<string>(
                name: "PhotoKey",
                table: "People",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PhotoKey",
                table: "People");

            migrationBuilder.AddColumn<Guid>(
                name: "PhotoId",
                table: "People",
                type: "uniqueidentifier",
                nullable: true);
        }
    }
}
