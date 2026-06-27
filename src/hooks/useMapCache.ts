import { useState } from 'react';
import { db } from '../db/dexieDb';
import { rewriteStyleUrls, rewriteTilesJson } from '../utils/mapProtocol';

const BASE = 'https://demotiles.maplibre.org';
const STYLE_URL = `${BASE}/style.json`;
const TILES_JSON_URL = `${BASE}/tiles/tiles.json`;
const BATCH_SIZE = 15;

// Тип для tiles.json
interface TilesJson {
  tiles: string[];
  bounds?: [number, number, number, number]; // [west, south, east, north]
  minzoom?: number;
  maxzoom?: number;
  [key: string]: unknown;
}

function toIdb(url: string): string {
  return url.replace('https://', 'idb://');
}

// Конвертация lng/lat в тайловые координаты x/y для заданного zoom
function lngToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, z));
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z));
}

// Генерируем только те тайлы, которые попадают в bounds из tiles.json
function getTileUrls(tileTemplate: string, tilesJson: TilesJson): string[] {
  const urls: string[] = [];
  const maxZoom = tilesJson.maxzoom ?? 6;
  const minZoom = tilesJson.minzoom ?? 0;
  // Если bounds нет — берём весь мир, но это приведёт к 404 для пустых тайлов
  const [west, south, east, north] = tilesJson.bounds ?? [-180, -85.051129, 180, 85.051129];

  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = lngToTileX(west, z);
    const xMax = lngToTileX(east, z);
    const yMin = latToTileY(north, z); // north → меньший y
    const yMax = latToTileY(south, z); // south → больший y
    const maxIndex = Math.pow(2, z) - 1;

    for (let x = Math.max(0, xMin); x <= Math.min(maxIndex, xMax); x++) {
      for (let y = Math.max(0, yMin); y <= Math.min(maxIndex, yMax); y++) {
        const url = tileTemplate
          .replace('{z}', String(z))
          .replace('{x}', String(x))
          .replace('{y}', String(y));
        urls.push(url);
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

async function storeJson(url: string): Promise<void> {
  const json = rewriteTilesJson(await fetch(url).then(r => r.json()));
  const data = new TextEncoder().encode(JSON.stringify(json)).buffer as ArrayBuffer;
  await db.tiles.put({ url: toIdb(url), data });
}

export function useMapCache(onDownloaded: (json: object) => void) {
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  async function downloadMap() {
    // БАГ 4 FIX: try/finally гарантирует сброс progress при любой ошибке
    try {
      await db.styles.clear();
      await db.tiles.clear();
      // БАГ 3 FIX: сбрасываем флаг готовности тайлов перед новой загрузкой
      await db.meta.put({ key: 'tilesReady', value: false });

      const styleJson = rewriteStyleUrls(await fetch(STYLE_URL).then(r => r.json()));
      await db.styles.put({ id: 'default', json: styleJson });

      // БАГ 1 FIX: загружаем tiles.json и читаем реальный шаблон из поля tiles[0]
      const tilesJson: TilesJson = await fetch(TILES_JSON_URL).then(r => r.json());
      const tileTemplate = tilesJson.tiles[0];
      await storeJson(TILES_JSON_URL);

      const tileUrls = getTileUrls(tileTemplate, tilesJson);
      const total = tileUrls.length;
      setProgress({ current: 0, total });

      for (let i = 0; i < tileUrls.length; i += BATCH_SIZE) {
        await Promise.all(tileUrls.slice(i, i + BATCH_SIZE).map(storeTile));
        setProgress({ current: Math.min(i + BATCH_SIZE, total), total });
      }

      // БАГ 3 FIX: помечаем тайлы как готовые только после полной загрузки
      await db.meta.put({ key: 'tilesReady', value: true });

      onDownloaded(styleJson);
    } finally {
      // БАГ 4 FIX: progress сбрасывается всегда — и при успехе, и при ошибке
      setProgress(null);
    }
  }

  return {
    downloadMap,
    progress,
    isDownloading: progress !== null,
  };
}