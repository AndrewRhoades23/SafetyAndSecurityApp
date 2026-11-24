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

    // If a violation type was selected, find it in the database.
    if (!string.IsNullOrWhiteSpace(violation.ViolationType))
    {
        var violationType = await db.ViolationTypes
            .FirstOrDefaultAsync(v => v.Name == violation.ViolationType);

        if (violationType == null)
            return Results.BadRequest(new
            {
                message = "Invalid violation type."
            });

        violation.ViolationTypeId = violationType.Id;
    }
    else
    {
        // Drafts may not have a violation type selected yet.
        violation.ViolationTypeId = null;
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


// Determine the current and requested ticket statuses.
var currentStatus = existingViolation.Status;
var requestedStatus = updatedViolation.Status;

// Define valid ticket workflow transitions.
var validTransition = currentStatus switch
{
    "draft" => requestedStatus is "draft" or "issued",

    "issued" => requestedStatus is
        "issued" or "reviewed" or "flagged" or "appealed",

    "reviewed" => requestedStatus is
        "reviewed" or "submitted" or "flagged" or "appealed",

    "flagged" => requestedStatus is "flagged" or "issued",

    "appealed" => requestedStatus is "appealed" or "issued",

    "submitted" => requestedStatus is "submitted" or "resolved",

    "resolved" => false,

    _ => false
};

if (!validTransition)
{
    return Results.BadRequest(new
    {
        message = $"Cannot change ticket status from {currentStatus} to {requestedStatus}."
    });
}


// Prevent submission before the appeal period expires.
if (currentStatus == "reviewed" &&
    requestedStatus == "submitted")
{
    var appealDeadline = existingViolation.DateIssued.AddDays(10);

    if (DateTime.UtcNow < appealDeadline)
    {
        return Results.BadRequest(new
        {
            message = "This ticket cannot be submitted until the appeal period has expired.",
            appealDeadline = appealDeadline
        });
    }
}


    // Require complete information whenever a ticket
    // is no longer being saved as a draft.
    if (requestedStatus != "draft")
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
    if (!string.IsNullOrWhiteSpace(updatedViolation.ViolationType))
    {
        var violationType = await db.ViolationTypes
            .FirstOrDefaultAsync(v =>
                v.Name == updatedViolation.ViolationType);

        if (violationType == null)
        {
            return Results.BadRequest(new
            {
                message = "Invalid violation type."
            });
        }

        existingViolation.ViolationTypeId = violationType.Id;
    }
    else
    {
        existingViolation.ViolationTypeId = null;
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

    
    // Start the appeal period when a draft is officially issued.
    if (currentStatus == "draft" &&
        requestedStatus == "issued")
    {
        existingViolation.DateIssued = DateTime.UtcNow;
    }

    // Update the ticket status.
    existingViolation.Status = requestedStatus;

    // Save the changes while preserving the original
    // ticket ID and officer information.
    await db.SaveChangesAsync();

    return Results.Ok(existingViolation);

});


app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
