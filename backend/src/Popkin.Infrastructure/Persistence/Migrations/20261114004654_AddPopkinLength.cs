using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPopkinLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Length",
                table: "Popkins",
                type: "nvarchar(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "");

            // A Popkin started before the length was kept: one with no end keeps going, and any
            // other ends on the date it has.
            migrationBuilder.Sql("UPDATE Popkins SET Length = CASE WHEN EndsAt IS NULL THEN 'KeepItGoing' ELSE 'UntilDate' END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Length",
                table: "Popkins");
        }
    }
}
