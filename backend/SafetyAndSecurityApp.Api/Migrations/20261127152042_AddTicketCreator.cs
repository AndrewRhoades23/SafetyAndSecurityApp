using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SafetyAndSecurityApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketCreator : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedById",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "ParkingViolations");
        }
    }
}
