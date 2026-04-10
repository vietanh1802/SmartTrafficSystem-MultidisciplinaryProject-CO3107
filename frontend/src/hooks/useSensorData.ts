import { useEffect, useState } from "react";
import { fetchSensorHistory, type SensorHistoryItem } from "../api/sensorApi";

type UseSensorDataOptions = {
pollMs?: number;
limit?: number;
};

export function useSensorData(options?: UseSensorDataOptions) {
const pollMs = options?.pollMs ?? 5000;
const limit = options?.limit ?? 20;

const [items, setItems] = useState<SensorHistoryItem[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  let mounted = true;

  const load = async () => {
    try {
      const data = await fetchSensorHistory(limit);
      if (!mounted) return;
      setItems(data);
      setError(null);
    } catch (e) {
      if (!mounted) return;
      setError("Cannot load sensor history");
      console.error(e);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  void load();
  const timer = setInterval(() => { void load(); }, pollMs);

  return () => {
    mounted = false;
    clearInterval(timer);
  };
}, [pollMs, limit]);

return { items, loading, error };
}