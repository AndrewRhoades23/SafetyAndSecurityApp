
namespace SafetyAndSecurityApp.Api.Models;

public class ParkingViolation
{
    // Ticket identification
    public int Id { get; set; }

    // Registered vehicle reference (optional)
    public int? VehicleId { get; set; }

    // Student information
    public string StudentId { get; set; } = string.Empty;
    public string ViolatorName { get; set; } = string.Empty;

    // Vehicle information at time of ticket
    public string LicensePlate { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string VehicleMake { get; set; } = string.Empty;
    public string VehicleModel { get; set; } = string.Empty;
    public string VehicleColor { get; set; } = string.Empty;

    // Violation information
    public int? ViolationTypeId { get; set; }
    public string ViolationType { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public decimal FineAmount { get; set; }
    public DateTime DateIssued { get; set; } = DateTime.UtcNow;
    public string Notes { get; set; } = string.Empty;

    // Officer information
    public string OfficerId { get; set; } = string.Empty;
    public string OfficerName { get; set; } = string.Empty;

    // Ticket workflow
    public string Status { get; set; } = "issued";
}
