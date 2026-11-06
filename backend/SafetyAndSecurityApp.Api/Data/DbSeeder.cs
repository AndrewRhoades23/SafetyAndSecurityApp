
using Microsoft.EntityFrameworkCore;
using SafetyAndSecurityApp.Api.Models;

namespace SafetyAndSecurityApp.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Only add vehicles if the table is empty
        if (!await db.Vehicles.AnyAsync())
        {
            db.Vehicles.AddRange(
                new Vehicle
                {
                    LicensePlate = "ABC1234",
                    State = "MO",
                    StudentId = "100001",
                    ViolatorName = "John Smith",
                    VehicleMake = "Toyota",
                    VehicleModel = "Camry",
                    VehicleColor = "Silver"
                },
                new Vehicle
                {
                    LicensePlate = "XYZ5678",
                    State = "MO",
                    StudentId = "100002",
                    ViolatorName = "Sarah Johnson",
                    VehicleMake = "Honda",
                    VehicleModel = "Civic",
                    VehicleColor = "Black"
                },
                new Vehicle
                {
                    LicensePlate = "DEF9012",
                    State = "KS",
                    StudentId = "100003",
                    ViolatorName = "Michael Brown",
                    VehicleMake = "Ford",
                    VehicleModel = "F-150",
                    VehicleColor = "Blue"
                }
            );
        }

        var violationTypes = new List<ViolationType>
        {
           
            new ViolationType{
                Name = "Parking in Reserved Space",
                DefaultFine = 30
            },
            new ViolationType
            {
                Name = "Parking in a Marked Fire Lane",
                DefaultFine = 50
            },
            new ViolationType
            {
                Name = "Double Parking",
                DefaultFine = 30
            },
            new ViolationType
            {
                Name = "Disabled Parking Violation",
                DefaultFine = 50
            },
            new ViolationType
            {
                Name = "No (or improperly displayed) SBU Permit",
                DefaultFine = 30
            },
            new ViolationType
            {
                Name = "Failure to stop at a stop sign",
                DefaultFine = 30
            },
            new ViolationType
            {
                Name = "Parked on grassy/non-striped area",
                DefaultFine = 30
            },
            new ViolationType
            {
                Name = "Parked on sidewalk, Pedestrian Crosswalk or No Parking Area",
                DefaultFine = 30
            }
        };

        foreach (var violationType in violationTypes)
        {
            var existingType = await db.ViolationTypes
                .FirstOrDefaultAsync(v => v.Name == violationType.Name);

            if (existingType == null)
            {
                // Add new violation types
                db.ViolationTypes.Add(violationType);
            }
            else
            {
                // Update fines for existing violation types
                existingType.DefaultFine = violationType.DefaultFine;
            }
        }

        await db.SaveChangesAsync();
    }
}
