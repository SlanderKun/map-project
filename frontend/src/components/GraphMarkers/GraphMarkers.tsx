import { Marker, Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayerSpecification } from 'maplibre-gl';

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

const EDGES_LAYER: LineLayerSpecification = {
  id: 'graph-edges-top',
  type: 'line',
  source: 'graph-edges-top',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: { 'line-color': '#0f172a', 'line-width': 2, 'line-opacity': 0.85 },
};

const ROUTE_LAYER: LineLayerSpecification = {
  id: 'route-top',
  type: 'line',
  source: 'route-top',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: { 'line-color': '#dc2626', 'line-width': 6, 'line-opacity': 1 },
};

interface Props {
  graphGeoJson: {
    nodes: GeoJSON.FeatureCollection;
    edges: GeoJSON.FeatureCollection;
  } | null;
  routeGeoJson: GeoJSON.FeatureCollection;
}

export default function GraphMarkers({ graphGeoJson, routeGeoJson }: Props) {
  if (!graphGeoJson || graphGeoJson.nodes.features.length === 0) {
    return null;
  }

  return (
    <>
      <Source id="graph-edges-top" type="geojson" data={graphGeoJson.edges}>
        <Layer {...EDGES_LAYER} />
      </Source>
      <Source id="route-top" type="geojson" data={routeGeoJson}>
        <Layer {...ROUTE_LAYER} />
      </Source>
      {graphGeoJson.nodes.features.map((feature, index) => {
        if (feature.geometry.type !== 'Point') return null;
        const [lng, lat] = feature.geometry.coordinates;
        const terrain = String(feature.properties?.terrain_type ?? '');
        return (
          <Marker
            key={`n-${index}-${lng}-${lat}`}
            longitude={lng}
            latitude={lat}
            anchor="center"
          >
            <div
              className="graph-dot"
              style={{ background: TERRAIN_COLOR[terrain] ?? '#f97316' }}
              title={terrain}
            />
          </Marker>
        );
      })}
    </>
  );
}
