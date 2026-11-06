
const API_URL = "http://localhost:5168/api/vehicles";

export interface Vehicle {
  id: number;
  licensePlate: string;
  state: string;
  studentId: string;
  violatorName: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
}

export async function searchVehicles(
  plate: string
): Promise<Vehicle[]> {
  const response = await fetch(
    `${API_URL}/search?plate=${encodeURIComponent(plate.trim())}`
  );

  if (!response.ok) {
    throw new Error("Failed to search vehicles.");
  }

  return response.json();
}
