export type TicketStatus = "draft" | "issued" | "submitted" | "flagged" | "appealed" | "resolved"

export interface Ticket {
  id: string
  plate: string
  state: string
  studentId?: string
  violatorName?: string
  violation: string
  location: string
  fine: number
  issuedAt: string // ISO
  officerId: string
  officerName: string
  status: TicketStatus
  notes?: string
  vehicleMake?: string
  vehicleColor?: string
}

export const VIOLATIONS = [
  "Parking in Reserved Space",
  "Parking in a Marked Fire Lane",
  "Double Parking",
  "Disabled Parking Violation",
  "No (or impropely displayed) SBU Permit",
  "Failure to stop at a stop sign",
  "Parked on grassy/non-striped area",
  "Parking on sidewalk, Pedestrian Crosswalk or No Parking Area",
]

export const SAMPLE_TICKETS: Ticket[] = [
  {
    id: "TKT-2024-00891",
    plate: "HJK-4821",
    state: "CA",
    violation: "Parking in Reserved Space",
    location: "400 Main St, District 7",
    fine: 30,
    issuedAt: "2024-09-14T08:32:00Z",
    officerId: "OFF-003",
    officerName: "J. Martinez",
    status: "issued",
    vehicleMake: "Toyota Camry",
    vehicleColor: "Silver",
    notes: "Vehicle parked 45 min past expiry.",
  },
  {
    id: "TKT-2024-00890",
    plate: "XPQ-9034",
    state: "CA",
    violation: "Parking in a Marked Fire Lane",
    location: "120 Harbor Blvd",
    fine: 50,
    issuedAt: "2024-09-14T07:15:00Z",
    officerId: "OFF-003",
    officerName: "J. Martinez",
    status: "submitted",
    vehicleMake: "Honda Civic",
    vehicleColor: "Black",
  },
  {
    id: "TKT-2024-00887",
    plate: "LMN-2200",
    state: "NV",
    violation: "Double Parking",
    location: "88 Olive Ave",
    fine: 30,
    issuedAt: "2024-09-13T14:22:00Z",
    officerId: "OFF-007",
    officerName: "R. Singh",
    status: "flagged",
    vehicleMake: "Ford F-150",
    vehicleColor: "Red",
    notes: "Vehicle blocking access by 18 inches.",
  },
  {
    id: "TKT-2024-00882",
    plate: "BRK-5571",
    state: "CA",
    violation: "Disabled Parking Violation",
    location: "2210 Westwood Dr",
    fine: 50,
    issuedAt: "2024-09-13T06:45:00Z",
    officerId: "OFF-003",
    officerName: "J. Martinez",
    status: "resolved",
    vehicleMake: "Chevrolet Malibu",
    vehicleColor: "White",
  },
  {
    id: "TKT-2024-00879",
    plate: "GHT-1190",
    state: "AZ",
    violation: "No (or impropely displayed) SBU Permit",
    location: "53 Commerce St",
    fine: 30,
    issuedAt: "2024-09-12T11:08:00Z",
    officerId: "OFF-012",
    officerName: "T. Okafor",
    status: "submitted",
    vehicleMake: "Nissan Altima",
    vehicleColor: "Blue",
  },
  {
    id: "TKT-2024-00875",
    plate: "PLY-3344",
    state: "CA",
    violation: "Failure to stop at a stop sign",
    location: "1400 Central Ave",
    fine: 30,
    issuedAt: "2024-09-12T09:30:00Z",
    officerId: "OFF-007",
    officerName: "R. Singh",
    status: "flagged",
    vehicleMake: "BMW 3 Series",
    vehicleColor: "Gray",
    notes: "No placard displayed. Owner contacted.",
  },
  {
    id: "TKT-2024-00871",
    plate: "VWX-6622",
    state: "CA",
    violation: "Parked on grassy/non-striped area",
    location: "300 Elm St",
    fine: 30,
    issuedAt: "2024-09-11T16:50:00Z",
    officerId: "OFF-003",
    officerName: "J. Martinez",
    status: "issued",
    vehicleMake: "Kia Sorento",
    vehicleColor: "Green",
  },
  {
    id: "TKT-2024-00866",
    plate: "HJK-4821",
    state: "CA",
    violation: "Parking on sidewalk, Pedestrian Crosswalk or No Parking Area",
    location: "700 Oak Blvd",
    fine: 30,
    issuedAt: "2024-09-10T07:00:00Z",
    officerId: "OFF-003",
    officerName: "J. Martinez",
    status: "submitted",
    vehicleMake: "Toyota Camry",
    vehicleColor: "Silver",
  },
]
