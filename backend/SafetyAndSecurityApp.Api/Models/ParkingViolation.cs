namespace SafetyAndSecurityApp.Api.Models;

public class ParkingViolation
{
    public int Id { get; set; }

    public string ViolationType { get; set; } = string.Empty;

    public string VehicleDescription { get; set; } = string.Empty;

    public string LicensePlate { get; set; } = string.Empty;

    public decimal FineAmount { get; set; }

    public DateTime DateIssued { get; set; } = DateTime.UtcNow;
}