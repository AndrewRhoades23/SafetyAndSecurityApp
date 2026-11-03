import type { Ticket } from "../data/tickets";

const API_URL = "http://localhost:5000/api/parkingviolations";

interface ParkingViolationResponse {
  id: number;
  violationType: string;
  vehicleDescription: string;
  licensePlate: string;
  fineAmount: number;
  dateIssued: string;
}

export async function getTickets(): Promise<Ticket[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to load parking tickets.");
  }

  const violations: ParkingViolationResponse[] =
    await response.json();

  return violations.map((violation) => ({
    id: String(violation.id),
    plate: violation.licensePlate,
    state: "",
    violation: violation.violationType,
    location: "",
    fine: violation.fineAmount,
    issuedAt: violation.dateIssued,
    officerId: "",
    officerName: "",
    status: "issued",
    vehicleMake: violation.vehicleDescription,
  }));
}