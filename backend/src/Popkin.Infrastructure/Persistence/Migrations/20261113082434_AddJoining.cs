using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddJoining : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "InvitedByMembershipId",
                table: "Memberships",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhotoKey",
                table: "Memberships",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InvitedByMembershipId",
                table: "Memberships");

            migrationBuilder.DropColumn(
                name: "PhotoKey",
                table: "Memberships");
        }
    }
}
