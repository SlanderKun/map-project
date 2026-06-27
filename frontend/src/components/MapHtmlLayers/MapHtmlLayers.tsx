import { useEffect, useMemo, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import type { MapMouseEvent, Map as MaplibreMap } from 'maplibre-gl';
import type { Point, PointKey } from '../../models/shared';
import type { RouteCoord } from '../../hooks/useRoute';

const TERRAIN_COLOR: Record<string, string> = {
  shallow_water: '#2563eb',
  deep_water: '#1e3a8a',
  ice: '#0ea5e9',
  snow: '#94a3b8',
  swamp: '#65a30d',
  grass: '#22c55e',
  dirt: '#d97706',
  dense_forest: '#166534',
  mountains: '#78716c',
};

interface Props {
  graphGeoJson: {
    nodes: GeoJSON.FeatureCollection;
    edges: GeoJSON.FeatureCollection;
  } | null;
  route: RouteCoord[];
  pointA: Point | null;
  pointB: Point | null;
  pendingKey: PointKey | null;
  onPointAdded: (key: PointKey, point: Point) => void;
}

function MapClickHandler({
  pendingKey,
  onPointAdded,
}: {
  pendingKey: PointKey | null;
  onPointAdded: (key: PointKey, point: Point) => void;
}) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    if (!mapRef || !pendingKey) return;
    const map = mapRef.getMap();
    const onClick = (e: MapMouseEvent) => {
      onPointAdded(pendingKey, {
        id: pendingKey,
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
      });
    };
    map.on('click', onClick);
    map.getCanvas().style.cursor = 'crosshair';
    return () => {
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
    };
  }, [mapRef, pendingKey, onPointAdded]);

  return null;
}

function SvgPathOverlay({
  edgePaths,
  routePath,
}: {
  edgePaths: string[];
  routePath: string | null;
}) {
  if (edgePaths.length === 0 && !routePath) return null;

  return (
    <div className="map-svg-overlay">
      <svg width="100%" height="100%">
        {edgePaths.map((d, i) => (
          <path
            key={`e-${i}`}
            d={d}
            className="map-svg-overlay__edge"
          />
        ))}
        {routePath && (
          <path d={routePath} className="map-svg-overlay__route" />
        )}
      </svg>
    </div>
  );
}

function coordsToPath(
  map: MaplibreMap,
  coords: Array<{ lng: number; lat: number }>,
): string | null {
  if (coords.length < 2) return null;
  return coords
    .map((c, i) => {
      const p = map.project([c.lng, c.lat]);
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');
}

export default function MapHtmlLayers({
  graphGeoJson,
  route,
  pointA,
  pointB,
  pendingKey,
  onPointAdded,
}: Props) {
  const { current: mapRef } = useMap();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    const bump = () => setTick(n => n + 1);
    map.on('move', bump);
    map.on('zoom', bump);
    map.on('resize', bump);
    return () => {
      map.off('move', bump);
      map.off('zoom', bump);
      map.off('resize', bump);
    };
  }, [mapRef]);

  const edgePaths = useMemo(() => {
    if (!mapRef || !graphGeoJson) return [];
    const map = mapRef.getMap();
    return graphGeoJson.edges.features.flatMap(feature => {
      if (feature.geometry.type !== 'LineString') return [];
      const coords = feature.geometry.coordinates.map(([lng, lat]) => ({ lng, lat }));
      const d = coordsToPath(map, coords);
      return d ? [d] : [];
    });
  }, [mapRef, graphGeoJson, tick]);

  const routePath = useMemo(() => {
    if (!mapRef || route.length < 2) return null;
    return coordsToPath(mapRef.getMap(), route);
  }, [mapRef, route, tick]);

  return (
    <>
      <MapClickHandler pendingKey={pendingKey} onPointAdded={onPointAdded} />

      {graphGeoJson?.nodes.features.map((feature, index) => {
        if (feature.geometry.type !== 'Point') return null;
        const [lng, lat] = feature.geometry.coordinates;
        const terrain = String(feature.properties?.terrain_type ?? '');
        return (
          <Marker key={`n-${index}`} longitude={lng} latitude={lat} anchor="center">
            <div
              className="graph-dot"
              style={{ background: TERRAIN_COLOR[terrain] ?? '#f97316' }}
            />
          </Marker>
        );
      })}

      {pointA && (
        <Marker longitude={pointA.lng} latitude={pointA.lat} anchor="center">
          <div className="point-marker point-marker--a">A</div>
        </Marker>
      )}

      {pointB && (
        <Marker longitude={pointB.lng} latitude={pointB.lat} anchor="center">
          <div className="point-marker point-marker--b">B</div>
        </Marker>
      )}

      <SvgPathOverlay edgePaths={edgePaths} routePath={routePath} />
    </>
  );
}
