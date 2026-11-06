const API_URL = "http://localhost:5168/api/violationtypes";

export interface ViolationType {
  id: number;
  name: string;
  defaultFine: number;
}

export async function getViolationTypes(): Promise<ViolationType[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to load violation types.");
  }

  return response.json();
}