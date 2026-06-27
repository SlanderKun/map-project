// HTTP-слой. Моки заменяются на реальные fetch-вызовы когда появится бэкенд.
// Достаточно поменять функции ниже — сервис и IndexedDB трогать не нужно.

export interface ApiMap {
  id: number;
  name: string;
  pmtiles_url: string;
  description: string | null;
}

export interface ApiNode {
  id: number;
  map_id: number;
  // GeoJSON Point из PostGIS: { type: 'Point', coordinates: [lng, lat] }
  geom: { type: 'Point'; coordinates: [number, number] };
  is_walkable: boolean;
  terrain_type: string;
}

export interface ApiEdge {
  id: number;
  map_id: number;
  source_id: number;
  target_id: number;
  weight: number;
}

// ─── Моки ────────────────────────────────────────────────────────────────────

const MOCK_MAP: ApiMap = {
  id: 1,
  name: 'Demo Map',
  pmtiles_url: 'https://demotiles.maplibre.org/tiles/tiles.json',
  description: 'Демонстрационная карта MapLibre',
};

const MOCK_NODES: ApiNode[] = [
  { id: 1, map_id: 1, geom: { type: 'Point', coordinates: [4.89, 52.37] }, is_walkable: true,  terrain_type: 'dirt_trail' },
  { id: 2, map_id: 1, geom: { type: 'Point', coordinates: [4.90, 52.37] }, is_walkable: true,  terrain_type: 'dirt_trail' },
  { id: 3, map_id: 1, geom: { type: 'Point', coordinates: [4.90, 52.38] }, is_walkable: false, terrain_type: 'water'      },
  { id: 4, map_id: 1, geom: { type: 'Point', coordinates: [4.91, 52.38] }, is_walkable: true,  terrain_type: 'paved'      },
];

const MOCK_EDGES: ApiEdge[] = [
  { id: 1, map_id: 1, source_id: 1, target_id: 2, weight: 1.0 },
  { id: 2, map_id: 1, source_id: 2, target_id: 3, weight: 1.5 },
  { id: 3, map_id: 1, source_id: 3, target_id: 4, weight: 2.0 },
  { id: 4, map_id: 1, source_id: 1, target_id: 4, weight: 3.0 },
];

// Имитация сетевой задержки
const delay = (ms = 200) => new Promise(res => setTimeout(res, ms));

// ─── API-функции (заменить на fetch когда появится бэкенд) ───────────────────

export async function fetchMap(mapId: number): Promise<ApiMap> {
  await delay();
  // TODO: return fetch(`/api/maps/${mapId}`).then(r => r.json());
  return { ...MOCK_MAP, id: mapId };
}

export async function fetchNodes(mapId: number): Promise<ApiNode[]> {
  await delay();
  // TODO: return fetch(`/api/maps/${mapId}/nodes`).then(r => r.json());
  return MOCK_NODES.filter(n => n.map_id === mapId);
}

export async function fetchEdges(mapId: number): Promise<ApiEdge[]> {
  await delay();
  // TODO: return fetch(`/api/maps/${mapId}/edges`).then(r => r.json());
  return MOCK_EDGES.filter(e => e.map_id === mapId);
}