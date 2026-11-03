
namespace SafetyAndSecurityApp.Api.Models;

public class Vehicle
{
    public int Id { get; set; }

    public string LicensePlate { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;

    public string StudentId { get; set; } = string.Empty;
    public string ViolatorName { get; set; } = string.Empty;

    public string VehicleMake { get; set; } = string.Empty;
    public string VehicleModel { get; set; } = string.Empty;
    public string VehicleColor { get; set; } = string.Empty;
}
