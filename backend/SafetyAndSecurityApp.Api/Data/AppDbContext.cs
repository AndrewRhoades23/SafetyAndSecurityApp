using Microsoft.EntityFrameworkCore;
using SafetyAndSecurityApp.Api.Models;

namespace SafetyAndSecurityApp.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    // Parking tickets issued by officers
    public DbSet<ParkingViolation> ParkingViolations { get; set; }

    // Registered student vehicles
    public DbSet<Vehicle> Vehicles { get; set; }

    // Violation types and their associated fines
    public DbSet<ViolationType> ViolationTypes { get; set; }

    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Prevent duplicate registrations for the same plate and state
        modelBuilder.Entity<Vehicle>()
            .HasIndex(v => new { v.LicensePlate, v.State })
            .IsUnique();

        // Connect tickets to registered vehicles
        modelBuilder.Entity<ParkingViolation>()
            .HasOne<Vehicle>()
            .WithMany()
            .HasForeignKey(p => p.VehicleId)
            .OnDelete(DeleteBehavior.SetNull);

        // Connect tickets to violation types
        modelBuilder.Entity<ParkingViolation>()
            .HasOne<ViolationType>()
            .WithMany()
            .HasForeignKey(p => p.ViolationTypeId)
            .OnDelete(DeleteBehavior.Restrict);
    }

}