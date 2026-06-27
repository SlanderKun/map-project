import * as maplibregl from 'maplibre-gl';
import { db } from "./../db/dexieDb.ts";

const REAL_BASE = 'https://demotiles.maplibre.org';

export function registerIdbProtocol() {
  maplibregl.addProtocol('idb', async (params) => {
    const realUrl = params.url.replace('idb://', 'https://');

    const cached = await db.tiles.get(params.url);
    if (cached) return { data: cached.data };

    const res = await fetch(realUrl);
    const data = await res.arrayBuffer();
    await db.tiles.put({ url: params.url, data });

    return { data };
  });
}

export function rewriteStyleUrls(style: any): any {
  const s = structuredClone(style);

  if (s.glyphs) {
    s.glyphs = s.glyphs.replace(REAL_BASE, `idb://${REAL_BASE.replace('https://', '')}`);
  }

  for (const source of Object.values(s.sources) as any[]) {
    if (source.url) {
      source.url = source.url.replace(REAL_BASE, `idb://${REAL_BASE.replace('https://', '')}`);
    }
  }

  return s;
}