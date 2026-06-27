import { db } from '../db/dexieDb';
import { fetchMap, fetchNodes, fetchEdges } from '../http/apiRequests';
import type { ApiNode } from '../http/apiRequests';
import type { MapRecord, NodeRecord, EdgeRecord } from '../db/dexieDb';

// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface EdgeWithCoords extends EdgeRecord {
  source: { lng: number; lat: number };
  target: { lng: number; lat: number };
}

// ─── Адаптеры: API → IndexedDB ───────────────────────────────────────────────

function adaptNode(apiNode: ApiNode): NodeRecord {
  return {
    id: apiNode.id,
    map_id: apiNode.map_id,
    lng: apiNode.lon,
    lat: apiNode.lat,
    is_walkable: apiNode.is_walkable,
    terrain_type: apiNode.terrain_type,
  };
}

// ─── Сервис ──────────────────────────────────────────────────────────────────

export const mapDataService = {
  async syncMap(mapId: number): Promise<void> {
    const [apiMap, apiNodes, apiEdges] = await Promise.all([
      fetchMap(mapId),
      fetchNodes(mapId),
      fetchEdges(mapId),
    ]);

    const mapRecord: MapRecord = {
      id: apiMap.id,
      name: apiMap.name,
      pmtiles_url: apiMap.pmtiles_url,
      description: apiMap.description,
    };

    const nodeRecords: NodeRecord[] = apiNodes.map(adaptNode);

    const edgeRecords: EdgeRecord[] = apiEdges.map(e => ({
      id: e.id,
      map_id: e.map_id,
      source_id: e.source_id,
      target_id: e.target_id,
      weight: e.weight,
    }));

    await db.transaction('rw', db.maps, db.nodes, db.edges, async () => {
      await db.maps.put(mapRecord);
      await db.nodes.where('map_id').equals(mapId).delete();
      await db.edges.where('map_id').equals(mapId).delete();
      await db.nodes.bulkPut(nodeRecords);
      await db.edges.bulkPut(edgeRecords);
    });
  },

  async getMap(mapId: number): Promise<MapRecord | undefined> {
    return db.maps.get(mapId);
  },

  async getNodes(mapId: number): Promise<NodeRecord[]> {
    return db.nodes.where('map_id').equals(mapId).toArray();
  },

  async getEdges(mapId: number): Promise<EdgeRecord[]> {
    return db.edges.where('map_id').equals(mapId).toArray();
  },

  async getEdgesWithCoords(mapId: number): Promise<EdgeWithCoords[]> {
    const [edges, nodes] = await Promise.all([
      this.getEdges(mapId),
      this.getNodes(mapId),
    ]);

    const nodeMap = new Map<number, NodeRecord>(nodes.map(n => [n.id, n]));

    const result: EdgeWithCoords[] = [];
    for (const edge of edges) {
      const source = nodeMap.get(edge.source_id);
      const target = nodeMap.get(edge.target_id);
      if (!source || !target) continue;
      result.push({
        ...edge,
        source: { lng: source.lng, lat: source.lat },
        target: { lng: target.lng, lat: target.lat },
      });
    }
    return result;
  },
};