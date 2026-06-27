import * as maplibregl from 'maplibre-gl';
import { db } from '../db/dexieDb';

const HTTPS = 'https://';
const IDB = 'idb://';

export function rewriteStyleUrls(style: any): any {
  const s = structuredClone(style);

  if (s.glyphs) {
    s.glyphs = s.glyphs.replace(HTTPS, IDB);
  }

  for (const source of Object.values(s.sources) as any[]) {
    if (source.url) {
      source.url = source.url.replace(HTTPS, IDB);
    }
  }

  return s;
}

export function rewriteTilesJson(json: any): any {
  const s = structuredClone(json);
  if (s.tiles) {
    s.tiles = s.tiles.map((url: string) => url.replace(HTTPS, IDB));
  }
  return s;
}

export function registerIdbProtocol() {
  maplibregl.addProtocol(IDB.replace('://', ''), async (params) => {
    const realUrl = params.url.replace(IDB, HTTPS);
    const isJson = realUrl.endsWith('.json');

    const cached = await db.tiles.get(params.url);
    if (cached) {
      if (isJson) {
        return { data: JSON.parse(new TextDecoder().decode(cached.data)) };
      }
      // FIX 1: MapLibre requires Uint8Array for binary tile data, not ArrayBuffer
      return { data: new Uint8Array(cached.data) };
    }

    const res = await fetch(realUrl);

    // FIX 2: handle 404 / non-ok responses gracefully instead of crashing
    if (!res.ok) {
      if (isJson) {
        throw new Error(`Failed to fetch ${realUrl}: ${res.status}`);
      }
      // Return empty tile — MapLibre will skip rendering it
      return { data: new Uint8Array(0) };
    }

    const contentType = res.headers.get('content-type') ?? '';

    if (isJson || contentType.includes('json')) {
      const json = rewriteTilesJson(await res.json());
      const data = new TextEncoder().encode(JSON.stringify(json)).buffer as ArrayBuffer;
      await db.tiles.put({ url: params.url, data });
      return { data: JSON.parse(new TextDecoder().decode(data)) };
    }

    const data = await res.arrayBuffer();
    await db.tiles.put({ url: params.url, data });
    // FIX 1 (same): return Uint8Array, not raw ArrayBuffer
    return { data: new Uint8Array(data) };
  });
}