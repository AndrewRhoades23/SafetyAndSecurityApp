using Microsoft.EntityFrameworkCore;
using SafetyAndSecurityApp.Api.Data;
using SafetyAndSecurityApp.Api.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// Add services to the container.
builder.Services.AddOpenApi();

var app = builder.Build();
app.UseCors("AllowReactFrontend");

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();

    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await DbSeeder.SeedAsync(db);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/api/vehicles/search", async (
    string plate,
    AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(plate))
    {
        return Results.BadRequest(new
        {
            message = "License plate is required."
        });
    }

    var normalizedPlate = plate.Trim().ToUpperInvariant();

    var vehicles = await db.Vehicles
        .Where(v => v.LicensePlate == normalizedPlate)
        .ToListAsync();

    return Results.Ok(vehicles);
});

app.MapGet("/api/violationtypes", async (AppDbContext db) =>
{
    var violationTypes = await db.ViolationTypes
        .OrderBy(v => v.Name)
        .ToListAsync();

    return Results.Ok(violationTypes);
});

app.MapGet("/api/parkingviolations", async (AppDbContext db) =>
{
    var violations = await db.ParkingViolations
        .OrderByDescending(v => v.DateIssued)
        .ToListAsync();

    return Results.Ok(violations);
});


app.MapPost("/api/parkingviolations", async (
    ParkingViolation violation,
    AppDbContext db) =>
{
    // Make sure the ticket has a valid status.
    if (violation.Status != "draft" &&
        violation.Status != "issued")
    {
        return Results.BadRequest(new
        {
            message = "Invalid ticket status."
        });
    }

    // Only require completed information when issuing a ticket.
    // Drafts can be saved with missing information.
    if (violation.Status == "issued")
    {
        if (string.IsNullOrWhiteSpace(violation.LicensePlate))
            return Results.BadRequest(new
            {
                message = "License plate is required."
            });

        if (string.IsNullOrWhiteSpace(violation.State))
            return Results.BadRequest(new
            {
                message = "License plate state is required."
            });

        if (string.IsNullOrWhiteSpace(violation.ViolationType))
            return Results.BadRequest(new
            {
                message = "Violation type is required."
            });

        if (string.IsNullOrWhiteSpace(violation.Location))
            return Results.BadRequest(new
            {
                message = "Location is required."
            });
    }

    // Fine amounts cannot be negative, even for drafts.
    if (violation.FineAmount < 0)
        return Results.BadRequest(new
        {
            message = "Fine amount cannot be negative."
        });

    // Look up all selected violation types.
    var selectedNames = violation.ViolationType
        .Split(';', StringSplitOptions.RemoveEmptyEntries |
                    StringSplitOptions.TrimEntries)
        .Distinct()
        .ToList();

    // Issued tickets must contain at least one violation.
    if (violation.Status == "issued" && selectedNames.Count == 0){
    return Results.BadRequest(new
    {
        message = "Violation type is required."
    });
    }

    if (selectedNames.Count > 0)
    {
        var selectedTypes = await db.ViolationTypes
            .Where(v => selectedNames.Contains(v.Name))
            .ToListAsync();

        if (selectedTypes.Count != selectedNames.Count)
        {
            return Results.BadRequest(new
            {
                message = "One or more violation types are invalid."
            });
        }

        // Calculate the combined fine.
        violation.FineAmount = selectedTypes
            .Sum(v => v.DefaultFine);

        // Preserve the ID relationship for single violations.
        violation.ViolationTypeId =
            selectedTypes.Count == 1
                ? selectedTypes[0].Id
                : null;

        // Store all selected violation names.
        violation.ViolationType =
            string.Join("; ", selectedNames);
    }
    else
    {
        // Drafts may not have violations selected yet.
        violation.ViolationTypeId = null;
        violation.ViolationType = string.Empty;
        violation.FineAmount = 0;
    }


    // Assign the database ID and timestamp.
    violation.Id = 0;
    violation.DateIssued = DateTime.UtcNow;

    // Save the ticket to SQLite.
    db.ParkingViolations.Add(violation);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/parkingviolations/{violation.Id}",
        violation
    );
});


app.MapPut("/api/parkingviolations/{id:int}", async (
    int id,
    ParkingViolation updatedViolation,
    AppDbContext db) =>
{
    // Find the existing ticket in SQLite.
    var existingViolation = await db.ParkingViolations
        .FindAsync(id);

    if (existingViolation == null)
    {
        return Results.NotFound(new
        {
            message = "Ticket not found."
        });
    }

// Allow existing tickets to be updated,
// including tickets submitted to Sells.
if (existingViolation.Status != "draft" &&
    existingViolation.Status != "issued" &&
    existingViolation.Status != "flagged" &&
    existingViolation.Status != "submitted")
    {
        return Results.BadRequest(new
        {
            message = "This ticket cannot be edited."
        });
    }

    // Require complete information unless the ticket remains a draft.
if (existingViolation.Status != "draft" || updatedViolation.Status != "draft")
    {
        if (string.IsNullOrWhiteSpace(updatedViolation.LicensePlate))
            return Results.BadRequest(new
            {
                message = "License plate is required."
            });

        if (string.IsNullOrWhiteSpace(updatedViolation.State))
            return Results.BadRequest(new
            {
                message = "License plate state is required."
            });

        if (string.IsNullOrWhiteSpace(updatedViolation.ViolationType))
            return Results.BadRequest(new
            {
                message = "Violation type is required."
            });

        if (string.IsNullOrWhiteSpace(updatedViolation.Location))
            return Results.BadRequest(new
            {
                message = "Location is required."
            });
    }

    if (updatedViolation.FineAmount < 0)
    {
        return Results.BadRequest(new
        {
            message = "Fine amount cannot be negative."
        });
    }

    // Look up the selected violation type.
    var selectedNames = updatedViolation.ViolationType
        .Split(';', StringSplitOptions.RemoveEmptyEntries |
                    StringSplitOptions.TrimEntries)
        .Distinct()
        .ToList();

    if (selectedNames.Count > 0)
    {
        var selectedTypes = await db.ViolationTypes
            .Where(v => selectedNames.Contains(v.Name))
            .ToListAsync();

        if (selectedTypes.Count != selectedNames.Count)
        {
            return Results.BadRequest(new
            {
                message = "One or more violation types are invalid."
            });
        }

        // Calculate the combined fine.
        updatedViolation.FineAmount = selectedTypes
            .Sum(v => v.DefaultFine);

        // Preserve the existing ID relationship for single violations.
        existingViolation.ViolationTypeId =
            selectedTypes.Count == 1
                ? selectedTypes[0].Id
                : null;

        updatedViolation.ViolationType =
            string.Join("; ", selectedNames);
    }
    else
    {
        existingViolation.ViolationTypeId = null;
        updatedViolation.FineAmount = 0;
    }

    // Update the ticket's editable fields.
    existingViolation.StudentId = updatedViolation.StudentId;
    existingViolation.ViolatorName = updatedViolation.ViolatorName;
    existingViolation.LicensePlate = updatedViolation.LicensePlate;
    existingViolation.State = updatedViolation.State;
    existingViolation.VehicleMake = updatedViolation.VehicleMake;
    existingViolation.VehicleModel = updatedViolation.VehicleModel;
    existingViolation.VehicleColor = updatedViolation.VehicleColor;
    existingViolation.ViolationType = updatedViolation.ViolationType;
    existingViolation.Location = updatedViolation.Location;
    existingViolation.FineAmount = updatedViolation.FineAmount;
    existingViolation.Notes = updatedViolation.Notes;

    // Validate the requested status.
    var allowedStatuses = new[]
    {
        "draft",
        "issued",
        "flagged",
        "appealed",
        "submitted",
        "resolved"
    };

    if (!allowedStatuses.Contains(updatedViolation.Status))
    {
        return Results.BadRequest(new
        {
            message = "Invalid ticket status."
        });
    }

    // Set the actual issuance date when issuing a draft.
    if (existingViolation.Status == "draft" && updatedViolation.Status == "issued"){
         existingViolation.DateIssued = DateTime.UtcNow;
    }

    // Update the ticket status.
    existingViolation.Status = updatedViolation.Status;

    // Preserve the original ticket ID and officer.
    await db.SaveChangesAsync();

    return Results.Ok(existingViolation);
});


app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
