import { useEffect, useRef, useState } from 'react';
import { Graph } from '../utils/graph';
import { bidirectionalAStar } from '../utils/astar';
import { mapDataService } from '../services/mapDataService';
import type { RoutingProfile } from '../utils/parameters';
import type { Point } from '../models/shared';

const MAP_ID = 1;

export interface RouteCoord {
  lng: number;
  lat: number;
}

export function useRoute(pointA: Point | null, pointB: Point | null, profile: RoutingProfile) {
  const graphRef = useRef<Graph | null>(null);
  const [route, setRoute] = useState<RouteCoord[]>([]);

  // Строим граф один раз при монтировании
  useEffect(() => {
    async function buildGraph() {
      const [nodes, edges] = await Promise.all([
        mapDataService.getNodes(MAP_ID),
        mapDataService.getEdges(MAP_ID),
      ]);
      const graph = new Graph();
      graph.loadFromIndexedDB(nodes, edges);
      graphRef.current = graph;
      console.log('graph nodes:', graph.nodes.size, 'edges loaded:', edges.length);
    }
    buildGraph();
  }, []);

  // Пересчитываем маршрут когда меняются точки или профиль
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !pointA || !pointB) {
      setRoute([]);
      return;
    }

    const startNode = graph.findNearest(pointA.lng, pointA.lat);
    const goalNode = graph.findNearest(pointB.lng, pointB.lat);

    if (!startNode || !goalNode) {
      setRoute([]);
      return;
    }

    console.log('graph nodes:', graph.nodes.size);
    console.log('pointA:', pointA, 'pointB:', pointB);

    const nodeIds = bidirectionalAStar(graph, startNode.id, goalNode.id, profile);

    const coords = nodeIds.flatMap(id => {
      const node = graph.getNode(id);
      return node ? [{ lng: node.lon, lat: node.lat }] : [];
    });

    setRoute(coords);
  }, [pointA, pointB, profile]);

  return { route };
}