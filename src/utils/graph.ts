import type { TerrainType } from './parameters';
import type { NodeRecord, EdgeRecord } from '../db/dexieDb';

export interface NodeState {
  isWalkable: boolean;
  terrainType: TerrainType;
}

export interface Edge {
  targetId: string;
  weight: number;
}

export interface GraphNode {
  id: string;
  lat: number;
  lon: number;
  state: NodeState;
  edges: Edge[];
}

export class Graph {
  public nodes: Map<string, GraphNode> = new Map();

  // Строит граф из данных IndexedDB
  // id конвертируется через String(), lon берётся из поля lng
  public loadFromIndexedDB(dbNodes: NodeRecord[], dbEdges: EdgeRecord[]): void {
    this.nodes.clear();

    for (const node of dbNodes) {
      this.nodes.set(String(node.id), {
        id: String(node.id),
        lat: node.lat,
        lon: node.lng, // NodeRecord.lng → GraphNode.lon
        state: {
          isWalkable: node.is_walkable,
          terrainType: node.terrain_type,
        },
        edges: [],
      });
    }

    for (const edge of dbEdges) {
      const sourceNode = this.nodes.get(String(edge.source_id));
      if (sourceNode) {
        sourceNode.edges.push({
          targetId: String(edge.target_id),
          weight: edge.weight,
        });
      }
    }
  }

  public getNode(nodeId: string): GraphNode | undefined {
    return this.nodes.get(nodeId);
  }

  // Находит ближайшую ноду к заданным координатам (перебором)
  public findNearest(lng: number, lat: number): GraphNode | null {
    let nearest: GraphNode | null = null;
    let minDist = Infinity;

    for (const node of this.nodes.values()) {
      const dist = Math.hypot(node.lon - lng, node.lat - lat);
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }

    return nearest;
  }
}