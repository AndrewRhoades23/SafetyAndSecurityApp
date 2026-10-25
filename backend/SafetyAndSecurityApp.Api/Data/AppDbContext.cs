using Microsoft.EntityFrameworkCore;
using SafetyAndSecurityApp.Api.Models;

namespace SafetyAndSecurityApp.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<ParkingViolation> ParkingViolations =>
        Set<ParkingViolation>();
}