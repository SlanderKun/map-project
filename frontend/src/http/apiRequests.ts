const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`;

export interface ApiMap {
  id: number;
  name: string;
  pmtiles_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiNode {
  id: number;
  map_id: number;
  lat: number;
  lon: number;
  is_walkable: boolean;
  terrain_type: string;
  created_at: string;
  updated_at: string;
}

export interface ApiEdge {
  id: number;
  map_id: number;
  source_id: number;
  target_id: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchMap(mapId: number): Promise<ApiMap> {
  return apiFetch(`/maps/${mapId}`);
}

export async function fetchNodes(mapId: number): Promise<ApiNode[]> {
  return apiFetch(`/nodes?map_id=${mapId}`);
}

export async function fetchEdges(mapId: number): Promise<ApiEdge[]> {
  return apiFetch(`/edges?map_id=${mapId}`);
}
