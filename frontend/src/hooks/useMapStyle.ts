import { useEffect, useState } from 'react';
import { db } from '../db/dexieDb';
import { buildOmtStyle, viewStateFromTileJson, type TileJsonMeta } from '../utils/mapStyle';

function styleKey(mapId: number) {
  return `map-${mapId}`;
}

export function useMapStyle(mapId: number | null, pmtilesUrl: string | null) {
  const [styleJson, setStyleJson] = useState<object | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [viewState, setViewState] = useState({ longitude: 135.07, latitude: 48.48, zoom: 11 });

  useEffect(() => {
    if (mapId == null || !pmtilesUrl) {
      setStyleJson(null);
      setMapReady(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setMapReady(false);

      const cached = await db.styles.get(styleKey(mapId!));
      const meta = await db.meta.get(`tilesReady:${mapId}`);
      if (cached && meta?.value) {
        if (!cancelled) {
          setStyleJson(cached.json);
          setIsOffline(true);
          setMapReady(true);
        }
        return;
      }

      try {
        const res = await fetch(pmtilesUrl!);
        if (!res.ok) throw new Error(`tilejson ${res.status}`);
        const tilejson: TileJsonMeta = await res.json();
        if (cancelled) return;

        setViewState(viewStateFromTileJson(tilejson));
        setStyleJson(buildOmtStyle(pmtilesUrl!));
        setIsOffline(false);
        setMapReady(true);
      } catch {
        if (!cancelled) {
          setStyleJson(null);
          setMapReady(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [mapId, pmtilesUrl]);

  function onOfflineReady(json: object) {
    setStyleJson(json);
    setIsOffline(true);
    setMapReady(true);
  }

  return { styleJson, mapReady, isOffline, viewState, onOfflineReady };
}
