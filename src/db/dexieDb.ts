import Dexie, { type Table } from 'dexie';

export interface StyleRecord {
  id: string;
  json: object;
}

export interface TileRecord {
  url: string;
  data: ArrayBuffer;
}

export interface MetaRecord {
  key: string;
  value: boolean | number | string;
}

export interface MapRecord {
  id: number;
  name: string;
  pmtiles_url: string;
  description: string | null;
}

export interface NodeRecord {
  id: number;
  map_id: number;
  lng: number;
  lat: number;
  is_walkable: boolean;
  terrain_type: string;
}

export interface EdgeRecord {
  id: number;
  map_id: number;
  source_id: number;
  target_id: number;
  weight: number;
}

class MapDB extends Dexie {
  styles!: Table<StyleRecord, string>;
  tiles!: Table<TileRecord, string>;
  meta!: Table<MetaRecord, string>;
  maps!: Table<MapRecord, number>;
  nodes!: Table<NodeRecord, number>;
  edges!: Table<EdgeRecord, number>;

  constructor() {
    super('mapDB');
    this.version(1).stores({
      styles: 'id',
      tiles: 'url',
    });
    this.version(2).stores({
      styles: 'id',
      tiles: 'url',
      meta: 'key',
    });
    // Версия 3: добавляем таблицы maps, nodes, edges
    this.version(3).stores({
      styles: 'id',
      tiles: 'url',
      meta: 'key',
      maps: 'id',
      nodes: 'id, map_id',
      edges: 'id, map_id, source_id, target_id',
    });
  }
}

export const db = new MapDB();