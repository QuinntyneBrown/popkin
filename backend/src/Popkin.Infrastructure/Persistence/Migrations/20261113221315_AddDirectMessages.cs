using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Popkin.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDirectMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Calls_PopkinId",
                table: "Calls");

            migrationBuilder.AddColumn<Guid>(
                name: "MemberAId",
                table: "ChatThreads",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MemberBId",
                table: "ChatThreads",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ThreadId",
                table: "Calls",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatThreads_MemberAId",
                table: "ChatThreads",
                column: "MemberAId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatThreads_MemberBId",
                table: "ChatThreads",
                column: "MemberBId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatThreads_PopkinId_MemberAId_MemberBId",
                table: "ChatThreads",
                columns: new[] { "PopkinId", "MemberAId", "MemberBId" },
                unique: true,
                filter: "[Kind] = 'Direct'");

            migrationBuilder.CreateIndex(
                name: "IX_Calls_PopkinId",
                table: "Calls",
                column: "PopkinId",
                unique: true,
                filter: "[EndedAt] IS NULL AND [ThreadId] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Calls_ThreadId",
                table: "Calls",
                column: "ThreadId",
                unique: true,
                filter: "[EndedAt] IS NULL AND [ThreadId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Calls_ChatThreads_ThreadId",
                table: "Calls",
                column: "ThreadId",
                principalTable: "ChatThreads",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ChatThreads_Memberships_MemberAId",
                table: "ChatThreads",
                column: "MemberAId",
                principalTable: "Memberships",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ChatThreads_Memberships_MemberBId",
                table: "ChatThreads",
                column: "MemberBId",
                principalTable: "Memberships",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Calls_ChatThreads_ThreadId",
                table: "Calls");

            migrationBuilder.DropForeignKey(
                name: "FK_ChatThreads_Memberships_MemberAId",
                table: "ChatThreads");

            migrationBuilder.DropForeignKey(
                name: "FK_ChatThreads_Memberships_MemberBId",
                table: "ChatThreads");

            migrationBuilder.DropIndex(
                name: "IX_ChatThreads_MemberAId",
                table: "ChatThreads");

            migrationBuilder.DropIndex(
                name: "IX_ChatThreads_MemberBId",
                table: "ChatThreads");

            migrationBuilder.DropIndex(
                name: "IX_ChatThreads_PopkinId_MemberAId_MemberBId",
                table: "ChatThreads");

            migrationBuilder.DropIndex(
                name: "IX_Calls_PopkinId",
                table: "Calls");

            migrationBuilder.DropIndex(
                name: "IX_Calls_ThreadId",
                table: "Calls");

            migrationBuilder.DropColumn(
                name: "MemberAId",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "MemberBId",
                table: "ChatThreads");

            migrationBuilder.DropColumn(
                name: "ThreadId",
                table: "Calls");

            migrationBuilder.CreateIndex(
                name: "IX_Calls_PopkinId",
                table: "Calls",
                column: "PopkinId",
                unique: true,
                filter: "[EndedAt] IS NULL");
        }
    }
}
