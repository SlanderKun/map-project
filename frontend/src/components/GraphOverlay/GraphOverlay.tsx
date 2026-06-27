import { useEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import type { GeoJSONSource, Map as MaplibreMap } from 'maplibre-gl';

interface Props {
  graphGeoJson: {
    nodes: GeoJSON.FeatureCollection;
    edges: GeoJSON.FeatureCollection;
  } | null;
  routeGeoJson: GeoJSON.FeatureCollection;
}

function upsertSource(map: MaplibreMap, id: string, data: GeoJSON.GeoJSON) {
  const existing = map.getSource(id) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }
  map.addSource(id, { type: 'geojson', data });
}

function ensureLayers(map: MaplibreMap) {
  if (!map.getSource('graph-edges')) {
    map.addSource('graph-edges', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('graph-edges')) {
    map.addLayer({
      id: 'graph-edges',
      type: 'line',
      source: 'graph-edges',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#1e293b', 'line-width': 2.5, 'line-opacity': 0.9 },
    });
    map.moveLayer('graph-edges');
  }

  if (!map.getSource('graph-nodes')) {
    map.addSource('graph-nodes', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('graph-nodes')) {
    map.addLayer({
      id: 'graph-nodes',
      type: 'circle',
      source: 'graph-nodes',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 6, 12, 10, 14, 14],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-color': [
          'match',
          ['get', 'terrain_type'],
          'shallow_water', '#2563eb',
          'deep_water', '#1e3a8a',
          'ice', '#7dd3fc',
          'snow', '#cbd5e1',
          'swamp', '#4d7c0f',
          'grass', '#22c55e',
          'dirt', '#b45309',
          'dense_forest', '#14532d',
          'mountains', '#57534e',
          '#f97316',
        ],
      },
    });
    map.moveLayer('graph-nodes');
  }

  if (!map.getSource('route')) {
    map.addSource('route', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('route')) {
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#dc2626', 'line-width': 6, 'line-opacity': 1 },
    });
    map.moveLayer('route');
  }
}

export default function GraphOverlay({ graphGeoJson, routeGeoJson }: Props) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();

    const setup = () => {
      ensureLayers(map);
      if (graphGeoJson) {
        upsertSource(map, 'graph-edges', graphGeoJson.edges);
        upsertSource(map, 'graph-nodes', graphGeoJson.nodes);
      }
      upsertSource(map, 'route', routeGeoJson);
    };

    if (map.isStyleLoaded()) setup();
    map.on('styledata', setup);
    return () => { map.off('styledata', setup); };
  }, [mapRef]);

  useEffect(() => {
    if (!mapRef || !graphGeoJson) return;
    const map = mapRef.getMap();
    if (!map.isStyleLoaded()) return;
    ensureLayers(map);
    upsertSource(map, 'graph-edges', graphGeoJson.edges);
    upsertSource(map, 'graph-nodes', graphGeoJson.nodes);
  }, [mapRef, graphGeoJson]);

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    if (!map.isStyleLoaded()) return;
    ensureLayers(map);
    upsertSource(map, 'route', routeGeoJson);
  }, [mapRef, routeGeoJson]);

  return null;
}
