export interface TileJsonMeta {
  bounds?: [number, number, number, number];
  center?: [number, number, number];
  minzoom?: number;
  maxzoom?: number;
}

/** Минимальный стиль OpenMapTiles для тайлов Martin/PMTiles */
export function buildOmtStyle(tilejsonUrl: string): object {
  return {
    version: 8,
    name: 'openmaptiles',
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: tilejsonUrl,
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#f2efe9' } },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': '#76b6e8' },
      },
      {
        id: 'landcover',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        paint: { 'fill-color': '#c8dbb0', 'fill-opacity': 0.55 },
      },
      {
        id: 'landuse',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        paint: { 'fill-color': '#e2e8d4', 'fill-opacity': 0.45 },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        paint: { 'fill-color': '#b8d4a0', 'fill-opacity': 0.5 },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        paint: { 'line-color': '#5aa0d8', 'line-width': 1.2 },
      },
      {
        id: 'transportation',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        paint: { 'line-color': '#ffffff', 'line-width': 1 },
      },
      {
        id: 'transportation-major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk'],
        paint: { 'line-color': '#f5a623', 'line-width': 2.5 },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13,
        paint: { 'fill-color': '#d6cec7', 'fill-opacity': 0.75 },
      },
      {
        id: 'place-label',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 8,
        layout: {
          'text-field': ['get', 'name:ru'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#333',
          'text-halo-color': '#fff',
          'text-halo-width': 1.5,
        },
      },
    ],
  };
}

export function viewStateFromTileJson(meta: TileJsonMeta) {
  if (meta.center && meta.center.length >= 2) {
    return {
      longitude: meta.center[0],
      latitude: meta.center[1],
      zoom: meta.center[2] ?? 11,
    };
  }
  if (meta.bounds) {
    const [west, south, east, north] = meta.bounds;
    return {
      longitude: (west + east) / 2,
      latitude: (south + north) / 2,
      zoom: 10,
    };
  }
  return { longitude: 135.07, latitude: 48.48, zoom: 11 };
}
