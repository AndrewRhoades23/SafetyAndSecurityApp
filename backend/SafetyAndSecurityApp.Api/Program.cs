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

    if (violation.FineAmount < 0)
        return Results.BadRequest(new
        {
            message = "Fine amount cannot be negative."
        });

    var violationType = await db.ViolationTypes
        .FirstOrDefaultAsync(v => v.Name == violation.ViolationType);

    if (violationType == null)
        return Results.BadRequest(new
        {
            message = "Invalid violation type."
        });

    // Use the configured violation type, but preserve
    // the fine amount entered by the officer.
    violation.ViolationTypeId = violationType.Id;

    // Prevent clients from choosing the database ID
    // or the official issuance timestamp.
    violation.Id = 0;
    violation.DateIssued = DateTime.UtcNow;
    violation.Status = "issued";

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
