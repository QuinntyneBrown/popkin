using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExperiences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Experiences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PopkinId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SharerMembershipId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    When = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Place = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    PictureKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PictureThumbnailKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SharedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Experiences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Experiences_Memberships_SharerMembershipId",
                        column: x => x.SharerMembershipId,
                        principalTable: "Memberships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Experiences_Popkins_PopkinId",
                        column: x => x.PopkinId,
                        principalTable: "Popkins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExperienceRatings",
                columns: table => new
                {
                    ExperienceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MembershipId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Stars = table.Column<int>(type: "int", nullable: false),
                    RatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CommentedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperienceRatings", x => new { x.ExperienceId, x.MembershipId });
                    table.CheckConstraint("CK_ExperienceRatings_Stars", "[Stars] BETWEEN 1 AND 5");
                    table.ForeignKey(
                        name: "FK_ExperienceRatings_Experiences_ExperienceId",
                        column: x => x.ExperienceId,
                        principalTable: "Experiences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExperienceRatings_Memberships_MembershipId",
                        column: x => x.MembershipId,
                        principalTable: "Memberships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceRatings_MembershipId",
                table: "ExperienceRatings",
                column: "MembershipId");

            migrationBuilder.CreateIndex(
                name: "IX_Experiences_PopkinId_SharedAt",
                table: "Experiences",
                columns: new[] { "PopkinId", "SharedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Experiences_SharerMembershipId",
                table: "Experiences",
                column: "SharerMembershipId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExperienceRatings");

            migrationBuilder.DropTable(
                name: "Experiences");
        }
    }
}
