import { useEffect, useRef, useState, useCallback } from 'react';

import { Graph } from '../utils/graph';

import { bidirectionalAStar } from '../utils/astar';

import { mapDataService } from '../services/mapDataService';

import { buildGraphGeoJson } from '../utils/graphGeoJson';

import { computeRouteSummary, type RouteSummary } from '../utils/routeMetrics';

import type { BoatSettings, RoutingProfile } from '../utils/parameters';

import type { Point } from '../models/shared';
import type { EdgeRecord, NodeRecord } from '../db/dexieDb';



export interface RouteCoord {

  lng: number;

  lat: number;

}



export function useRoute(mapId: number | null) {

  const graphRef = useRef<Graph | null>(null);

  const [route, setRoute] = useState<RouteCoord[]>([]);

  const [routeStatus, setRouteStatus] = useState<string | null>(null);

  const [routeStatusType, setRouteStatusType] = useState<'idle' | 'success' | 'error'>('idle');

  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const [graphReady, setGraphReady] = useState(false);

  const [graphCenter, setGraphCenter] = useState<{ lng: number; lat: number } | null>(null);

  const [graphGeoJson, setGraphGeoJson] = useState<ReturnType<typeof buildGraphGeoJson> | null>(null);



  const syncGraph = useCallback(async (id: number) => {

    setIsSyncing(true);

    setGraphReady(false);

    try {

      const { fetchNodes, fetchEdges } = await import('../http/apiRequests');
      const [apiNodes, apiEdges] = await Promise.all([fetchNodes(id), fetchEdges(id)]);

      const nodes: NodeRecord[] = apiNodes.map(n => ({
        id: n.id,
        map_id: n.map_id,
        lng: n.lon,
        lat: n.lat,
        is_walkable: n.is_walkable,
        terrain_type: n.terrain_type,
      }));
      const edges: EdgeRecord[] = apiEdges.map(e => ({
        id: e.id,
        map_id: e.map_id,
        source_id: e.source_id,
        target_id: e.target_id,
        weight: e.weight,
      }));

      mapDataService.syncMap(id).catch(() => undefined);

      const graph = new Graph();

      graph.loadFromIndexedDB(nodes, edges);

      graphRef.current = graph;

      setGraphGeoJson(buildGraphGeoJson(nodes, edges));

      setGraphReady(true);



      if (nodes.length > 0) {

        const avgLng = nodes.reduce((s, n) => s + n.lng, 0) / nodes.length;

        const avgLat = nodes.reduce((s, n) => s + n.lat, 0) / nodes.length;

        setGraphCenter({ lng: avgLng, lat: avgLat });

      } else {

        setGraphCenter(null);

      }

    } catch {

      graphRef.current = null;

      setGraphGeoJson(null);

      setGraphReady(false);

    } finally {

      setIsSyncing(false);

    }

  }, []);



  useEffect(() => {

    if (mapId == null) {

      graphRef.current = null;

      setGraphGeoJson(null);

      setGraphReady(false);

      return;

    }

    syncGraph(mapId);

  }, [mapId, syncGraph]);



  const buildRoute = useCallback((

    pointA: Point | null,

    pointB: Point | null,

    profile: RoutingProfile,

    boat: BoatSettings,

  ) => {

    const graph = graphRef.current;

    if (!graph || !pointA || !pointB) {

      setRoute([]);

      setRouteSummary(null);

      setRouteStatus('Укажите точки A и B');

      setRouteStatusType('error');

      return;

    }



    const startNode = graph.findNearest(pointA.lng, pointA.lat);

    const goalNode = graph.findNearest(pointB.lng, pointB.lat);



    if (!startNode || !goalNode) {

      setRoute([]);

      setRouteSummary(null);

      setRouteStatus('Не найдены ближайшие вершины графа');

      setRouteStatusType('error');

      return;

    }



    const nodeIds = bidirectionalAStar(graph, startNode.id, goalNode.id, profile);



    if (nodeIds.length === 0) {

      setRoute([]);

      setRouteSummary(null);

      setRouteStatus('Маршрут не найден');

      setRouteStatusType('error');

      return;

    }



    const pathNodes = nodeIds.flatMap(id => {

      const node = graph.getNode(id);

      return node ? [node] : [];

    });



    const coords = pathNodes.map(n => ({ lng: n.lon, lat: n.lat }));

    const summary = computeRouteSummary(pathNodes, profile, boat);



    setRoute(coords);

    setRouteSummary(summary);

    setRouteStatus(

      `${summary.distanceKm.toFixed(1)} км · ${Math.round(summary.timeMin)} мин · ${summary.fuelUsedL.toFixed(1)} л`,

    );

    setRouteStatusType('success');

  }, []);



  const clearRoute = useCallback(() => {

    setRoute([]);

    setRouteSummary(null);

    setRouteStatus(null);

    setRouteStatusType('idle');

  }, []);



  return {

    route,

    buildRoute,

    clearRoute,

    routeStatus,

    routeStatusType,

    routeSummary,

    isSyncing,

    syncGraph,

    graphReady,

    graphCenter,

    graphGeoJson,
    graphNodeCount: graphGeoJson?.nodes.features.length ?? 0,
  };

}


