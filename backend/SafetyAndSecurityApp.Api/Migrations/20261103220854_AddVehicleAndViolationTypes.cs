using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SafetyAndSecurityApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleAndViolationTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "VehicleDescription",
                table: "ParkingViolations",
                newName: "ViolatorName");

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "OfficerId",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "OfficerName",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "StudentId",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VehicleColor",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "VehicleId",
                table: "ParkingViolations",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VehicleMake",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VehicleModel",
                table: "ParkingViolations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ViolationTypeId",
                table: "ParkingViolations",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Vehicles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LicensePlate = table.Column<string>(type: "TEXT", nullable: false),
                    State = table.Column<string>(type: "TEXT", nullable: false),
                    StudentId = table.Column<string>(type: "TEXT", nullable: false),
                    ViolatorName = table.Column<string>(type: "TEXT", nullable: false),
                    VehicleMake = table.Column<string>(type: "TEXT", nullable: false),
                    VehicleModel = table.Column<string>(type: "TEXT", nullable: false),
                    VehicleColor = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vehicles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ViolationTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    DefaultFine = table.Column<decimal>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ViolationTypes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ParkingViolations_VehicleId",
                table: "ParkingViolations",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingViolations_ViolationTypeId",
                table: "ParkingViolations",
                column: "ViolationTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_LicensePlate_State",
                table: "Vehicles",
                columns: new[] { "LicensePlate", "State" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ParkingViolations_Vehicles_VehicleId",
                table: "ParkingViolations",
                column: "VehicleId",
                principalTable: "Vehicles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ParkingViolations_ViolationTypes_ViolationTypeId",
                table: "ParkingViolations",
                column: "ViolationTypeId",
                principalTable: "ViolationTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParkingViolations_Vehicles_VehicleId",
                table: "ParkingViolations");

            migrationBuilder.DropForeignKey(
                name: "FK_ParkingViolations_ViolationTypes_ViolationTypeId",
                table: "ParkingViolations");

            migrationBuilder.DropTable(
                name: "Vehicles");

            migrationBuilder.DropTable(
                name: "ViolationTypes");

            migrationBuilder.DropIndex(
                name: "IX_ParkingViolations_VehicleId",
                table: "ParkingViolations");

            migrationBuilder.DropIndex(
                name: "IX_ParkingViolations_ViolationTypeId",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "OfficerId",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "OfficerName",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "State",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "StudentId",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "VehicleColor",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "VehicleId",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "VehicleMake",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "VehicleModel",
                table: "ParkingViolations");

            migrationBuilder.DropColumn(
                name: "ViolationTypeId",
                table: "ParkingViolations");

            migrationBuilder.RenameColumn(
                name: "ViolatorName",
                table: "ParkingViolations",
                newName: "VehicleDescription");
        }
    }
}
