import type { EdgeRecord, NodeRecord } from '../db/dexieDb';

export function buildGraphGeoJson(nodes: NodeRecord[], edges: EdgeRecord[]) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const edgeFeatures: GeoJSON.Feature[] = [];
  for (const edge of edges) {
    const source = nodeMap.get(edge.source_id);
    const target = nodeMap.get(edge.target_id);
    if (!source || !target) continue;
    edgeFeatures.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [source.lng, source.lat],
          [target.lng, target.lat],
        ],
      },
      properties: { weight: edge.weight },
    });
  }

  const nodeFeatures: GeoJSON.Feature[] = nodes.map(n => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [n.lng, n.lat] },
    properties: {
      terrain_type: n.terrain_type,
      is_walkable: n.is_walkable,
    },
  }));

  return {
    edges: { type: 'FeatureCollection' as const, features: edgeFeatures },
    nodes: { type: 'FeatureCollection' as const, features: nodeFeatures },
  };
}
