import Dexie, { type Table } from 'dexie';

interface StyleRecord {
  id: string;
  json: object;
}

interface TileRecord {
  url: string;
  data: ArrayBuffer;
}

class MapDB extends Dexie {
  styles!: Table<StyleRecord, string>;
  tiles!: Table<TileRecord, string>;

  constructor() {
    super('mapDB');
    this.version(1).stores({
      styles: 'id',
      tiles: 'url',
    });
  }
}

export const db = new MapDB();