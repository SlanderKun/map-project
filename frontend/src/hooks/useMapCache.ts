import { useState } from 'react';
import { db } from '../db/dexieDb';
import { buildOmtStyle } from '../utils/mapStyle';
import { rewriteStyleUrls } from '../utils/mapProtocol';

const BATCH_SIZE = 20;

interface TileJson {
  tiles: string[];
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
}

function toIdb(url: string): string {
  return url.replace(/^https?:\/\//, 'idb://');
}

function lngToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * 2 ** z);
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
}

function getTileUrls(tileTemplate: string, tilesJson: TileJson): string[] {
  const urls: string[] = [];
  const maxZoom = Math.min(tilesJson.maxzoom ?? 14, 13);
  const minZoom = tilesJson.minzoom ?? 9;
  const [west, south, east, north] = tilesJson.bounds ?? [-180, -85.051129, 180, 85.051129];

  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = lngToTileX(west, z);
    const xMax = lngToTileX(east, z);
    const yMin = latToTileY(north, z);
    const yMax = latToTileY(south, z);
    const maxIndex = 2 ** z - 1;

    for (let x = Math.max(0, xMin); x <= Math.min(maxIndex, xMax); x++) {
      for (let y = Math.max(0, yMin); y <= Math.min(maxIndex, yMax); y++) {
        urls.push(
          tileTemplate
            .replace('{z}', String(z))
            .replace('{x}', String(x))
            .replace('{y}', String(y)),
        );
      }
    }
  }
  return urls;
}

async function storeTile(url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) return;
  const data = await res.arrayBuffer();
  await db.tiles.put({ url: toIdb(url), data });
}

export function useMapCache(
  mapId: number | null,
  pmtilesUrl: string | null,
  onOfflineReady: (json: object) => void,
) {
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  async function downloadMap() {
    if (!mapId || !pmtilesUrl) return;

    try {
      const tilejson: TileJson = await fetch(pmtilesUrl).then(r => r.json());
      const tileTemplate = tilejson.tiles[0];
      if (!tileTemplate) return;

      const styleJson = rewriteStyleUrls(buildOmtStyle(pmtilesUrl));
      await db.styles.put({ id: `map-${mapId}`, json: styleJson });

      const tileUrls = getTileUrls(tileTemplate, tilejson);
      const total = tileUrls.length;
      setProgress({ current: 0, total });

      for (let i = 0; i < tileUrls.length; i += BATCH_SIZE) {
        await Promise.all(tileUrls.slice(i, i + BATCH_SIZE).map(storeTile));
        setProgress({ current: Math.min(i + BATCH_SIZE, total), total });
      }

      await db.meta.put({ key: `tilesReady:${mapId}`, value: true });
      onOfflineReady(styleJson);
    } finally {
      setProgress(null);
    }
  }

  return {
    downloadMap,
    progress,
    isDownloading: progress !== null,
  };
}
