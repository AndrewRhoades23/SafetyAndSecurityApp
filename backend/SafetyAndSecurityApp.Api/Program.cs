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



app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
