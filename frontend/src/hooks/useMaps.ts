import { useEffect, useState } from 'react';
import { fetchMaps, type ApiMap } from '../http/apiRequests';

export function useMaps() {
  const [maps, setMaps] = useState<ApiMap[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaps()
      .then(data => {
        setMaps(data);
        if (data.length > 0) setSelectedMapId(data[0].id);
      })
      .catch(() => setMaps([]))
      .finally(() => setLoading(false));
  }, []);

  return { maps, selectedMapId, setSelectedMapId, loading };
}
