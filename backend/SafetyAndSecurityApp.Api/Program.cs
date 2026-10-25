using Microsoft.EntityFrameworkCore;
using SafetyAndSecurityApp.Api.Data;
using SafetyAndSecurityApp.Api.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

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

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

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
    if (string.IsNullOrWhiteSpace(violation.ViolationType))
    {
        return Results.BadRequest(new
        {
            message = "Violation type is required."
        });
    }

    if (violation.FineAmount < 0)
    {
        return Results.BadRequest(new
        {
            message = "Fine amount cannot be negative."
        });
    }

    violation.Id = 0;
    violation.DateIssued = DateTime.UtcNow;

    db.ParkingViolations.Add(violation);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/parkingviolations/{violation.Id}",
        violation);
});

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
