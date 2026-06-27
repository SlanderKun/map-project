import { AIRBOAT_PROFILES } from './parameters';
import type { RoutingProfile } from './parameters';
import { Graph } from './graph';
import type {  Edge, GraphNode } from './graph'
import {PriorityQueue} from './priorityQueue.ts';

function heuristic(nodeA: GraphNode, nodeB: GraphNode): number {
  return Math.hypot(nodeA.lon - nodeB.lon, nodeA.lat - nodeB.lat);
}

function calculateCost(edge: Edge, targetNode: GraphNode, profile: RoutingProfile): number {
  if (!targetNode.state.isWalkable) return Infinity;

  const terrain = targetNode.state.terrainType;
  const dangerMultipliers = AIRBOAT_PROFILES[profile];
  const multiplier = dangerMultipliers[terrain] ?? 10.0;

  return edge.weight * multiplier;
}

function reconstructBidirectionalPath(
  cameFromFwd: Map<string, string>,
  cameFromBwd: Map<string, string>,
  meetingNode: string
): string[] {
  const pathFwd: string[] = [meetingNode];
  let current = meetingNode;
  while (cameFromFwd.has(current)) {
    current = cameFromFwd.get(current)!;
    pathFwd.push(current);
  }
  pathFwd.reverse();

  const pathBwd: string[] = [];
  current = meetingNode;
  while (cameFromBwd.has(current)) {
    current = cameFromBwd.get(current)!;
    pathBwd.push(current);
  }

  return [...pathFwd, ...pathBwd];
}

export function bidirectionalAStar(
  graph: Graph,
  startId: string,
  goalId: string,
  profile: RoutingProfile = 'safe'
): string[] {
  const startNode = graph.getNode(startId);
  const goalNode = graph.getNode(goalId);

  if (!startNode || !goalNode || !startNode.state.isWalkable || !goalNode.state.isWalkable) {
    return [];
  }

  const queueFwd = new PriorityQueue<string>();
  const queueBwd = new PriorityQueue<string>();
  queueFwd.push(0.0, startId);
  queueBwd.push(0.0, goalId);

  const gScoreFwd = new Map<string, number>([[startId, 0.0]]);
  const gScoreBwd = new Map<string, number>([[goalId, 0.0]]);

  const cameFromFwd = new Map<string, string>();
  const cameFromBwd = new Map<string, string>();

  const visitedFwd = new Set<string>();
  const visitedBwd = new Set<string>();

  let bestPathCost = Infinity;
  let meetingNode: string | null = null;

  while (queueFwd.length > 0 && queueBwd.length > 0) {
    const currentFwd = queueFwd.pop()!.item;
    visitedFwd.add(currentFwd);

    const currentBwd = queueBwd.pop()!.item;
    visitedBwd.add(currentBwd);

    if (visitedBwd.has(currentFwd)) {
      const cost = gScoreFwd.get(currentFwd)! + (gScoreBwd.get(currentFwd) ?? Infinity);
      if (cost < bestPathCost) {
        bestPathCost = cost;
        meetingNode = currentFwd;
      }
    }

    if (visitedFwd.has(currentBwd)) {
      const cost = (gScoreFwd.get(currentBwd) ?? Infinity) + gScoreBwd.get(currentBwd)!;
      if (cost < bestPathCost) {
        bestPathCost = cost;
        meetingNode = currentBwd;
      }
    }

    if (meetingNode !== null) {
      return reconstructBidirectionalPath(cameFromFwd, cameFromBwd, meetingNode);
    }

    const nodeFwd = graph.getNode(currentFwd);
    if (nodeFwd) {
      for (const edge of nodeFwd.edges) {
        const neighborId = edge.targetId;
        const targetNode = graph.getNode(neighborId);
        if (!targetNode) continue;

        const stepCost = calculateCost(edge, targetNode, profile);
        if (stepCost === Infinity) continue;

        const tentativeG = gScoreFwd.get(currentFwd)! + stepCost;
        if (tentativeG < (gScoreFwd.get(neighborId) ?? Infinity)) {
          cameFromFwd.set(neighborId, currentFwd);
          gScoreFwd.set(neighborId, tentativeG);
          queueFwd.push(tentativeG + heuristic(targetNode, goalNode), neighborId);
        }
      }
    }

    const nodeBwd = graph.getNode(currentBwd);
    if (nodeBwd) {
      for (const edge of nodeBwd.edges) {
        const neighborId = edge.targetId;
        const targetNode = graph.getNode(neighborId);
        if (!targetNode) continue;

        const stepCost = calculateCost(edge, targetNode, profile);
        if (stepCost === Infinity) continue;

        const tentativeG = gScoreBwd.get(currentBwd)! + stepCost;
        if (tentativeG < (gScoreBwd.get(neighborId) ?? Infinity)) {
          cameFromBwd.set(neighborId, currentBwd);
          gScoreBwd.set(neighborId, tentativeG);
          queueBwd.push(tentativeG + heuristic(targetNode, startNode), neighborId);
        }
      }
    }
  }

  return [];
}