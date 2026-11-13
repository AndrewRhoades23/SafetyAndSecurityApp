
import type { Ticket, TicketStatus } from "../data/tickets";

const API_URL = "http://localhost:5168/api/parkingviolations";

interface ParkingViolationResponse {
  id: number;
  vehicleId: number | null;
  studentId: string;
  violatorName: string;
  licensePlate: string;
  state: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  violationType: string;
  location: string;
  fineAmount: number;
  dateIssued: string;
  notes: string;
  officerId: string;
  officerName: string;
  status: string;
}

export interface CreateTicketRequest {
  studentId: string;
  violatorName: string;
  licensePlate: string;
  state: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  violationType: string;
  location: string;
  fineAmount: number;
  notes: string;
  officerId: string;
  officerName: string;
  status: "draft" | "issued";
}

export interface UpdateTicketRequest
  extends Omit<CreateTicketRequest, "status"> {
  status: TicketStatus;
}

function mapTicket(violation: ParkingViolationResponse): Ticket {
  return {
    id: String(violation.id),
    plate: violation.licensePlate,
    state: violation.state,
    studentId: violation.studentId,
    violatorName: violation.violatorName,
    violation: violation.violationType,
    location: violation.location,
    fine: violation.fineAmount,
    issuedAt: violation.dateIssued,
    officerId: violation.officerId,
    officerName: violation.officerName,
    status: violation.status as TicketStatus,
    notes: violation.notes,
    vehicleMake: [
      violation.vehicleMake,
      violation.vehicleModel,
    ].filter(Boolean).join(" "),
    vehicleColor: violation.vehicleColor,
  };
}

export async function getTickets(): Promise<Ticket[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to load parking tickets.");
  }

  const violations: ParkingViolationResponse[] = await response.json();

  return violations.map(mapTicket);
}

export async function createTicket(
  ticket: CreateTicketRequest
): Promise<Ticket> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ticket),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      error?.message ?? "Failed to save parking ticket."
    );
  }

  const savedTicket: ParkingViolationResponse = await response.json();

  return mapTicket(savedTicket);
}


export async function updateTicket(
  id: string,
  ticket: UpdateTicketRequest
): Promise<Ticket> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ticket),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      error?.message ?? "Failed to update parking ticket."
    );
  }

  const updatedTicket: ParkingViolationResponse =
    await response.json();

  return mapTicket(updatedTicket);
}
