
namespace SafetyAndSecurityApp.Api.Models;

public class ViolationType
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;
    public decimal DefaultFine { get; set; }
}
