import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:5000";

export type SensorHistoryItem = {
  id: string;
  light_intensity: number;
  temperature: number;
  source: string;
  created_at: string | null;
};

export async function fetchSensorHistory(limit = 20): Promise<SensorHistoryItem[]> {
  const res = await axios.get(`${backendUrl}/api/sensor_history`, {
    params: { limit },
  });

  const payload = res.data?.data ?? [];
  return Array.isArray(payload) ? payload : [];
}
