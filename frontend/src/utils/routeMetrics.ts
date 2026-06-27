import type { GraphNode } from './graph';
import {
  GLIDE_BREAK_TERRAINS,
  INFLATABLE_FACTORS,
  LOAD_FACTORS,
  MODE_FACTORS,
  TERRAIN_FUEL_LPH,
  TERRAIN_SPEED_KMH,
  type BoatSettings,
  type RoutingProfile,
} from './parameters';

export interface RouteSegment {
  terrain: string;
  distanceKm: number;
}

export interface RouteSummary {
  distanceKm: number;
  timeMin: number;
  fuelUsedL: number;
  fuelRemainingL: number;
  rangeKm: number;
  warnings: string[];
  explanation: string;
  riskySegments: RouteSegment[];
}

function segmentKm(a: GraphNode, b: GraphNode): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function speedKmh(terrain: string, profile: RoutingProfile, boat: BoatSettings): number {
  let speed = TERRAIN_SPEED_KMH[terrain] ?? 10;
  if (speed <= 0) return 0;

  const load = LOAD_FACTORS[boat.load];
  const mode = MODE_FACTORS[profile];
  speed *= load.speed * mode.speed;

  if (boat.variant === 'inflatable') {
    speed *= INFLATABLE_FACTORS.speed;
    if (GLIDE_BREAK_TERRAINS.has(terrain)) {
      speed *= INFLATABLE_FACTORS.passability;
    }
  }

  return Math.max(speed, 3);
}

function fuelLph(terrain: string, profile: RoutingProfile, boat: BoatSettings): number {
  let lph = TERRAIN_FUEL_LPH[terrain] ?? 40;
  if (!Number.isFinite(lph)) return Infinity;

  const load = LOAD_FACTORS[boat.load];
  const mode = MODE_FACTORS[profile];
  lph *= load.fuel * mode.fuel;

  if (boat.variant === 'inflatable') {
    lph *= INFLATABLE_FACTORS.fuel;
  }

  return lph;
}

export function computeRouteSummary(
  pathNodes: GraphNode[],
  profile: RoutingProfile,
  boat: BoatSettings,
): RouteSummary {
  const warnings: string[] = [];
  const riskySegments: RouteSegment[] = [];
  let distanceKm = 0;
  let timeHours = 0;
  let fuelUsedL = 0;

  for (let i = 1; i < pathNodes.length; i++) {
    const prev = pathNodes[i - 1];
    const curr = pathNodes[i];
    const dist = segmentKm(prev, curr);
    const terrain = curr.state.terrainType;
    const speed = speedKmh(terrain, profile, boat);

    distanceKm += dist;

    if (speed <= 0) {
      warnings.push(`Непроходимый участок: ${terrain}`);
      continue;
    }

    const hours = dist / speed;
    timeHours += hours;
    fuelUsedL += (fuelLph(terrain, profile, boat) / 60) * (hours * 60);

    if (
      GLIDE_BREAK_TERRAINS.has(terrain) ||
      terrain === 'ice' ||
      terrain === 'shallow_water' && dist > 0.3
    ) {
      riskySegments.push({ terrain, distanceKm: dist });
    }

    if (profile === 'gliding' && GLIDE_BREAK_TERRAINS.has(terrain)) {
      warnings.push(`Потеря глиссирования: ${terrain}`);
    }
  }

  const fuelRemainingL = boat.fuelLiters - fuelUsedL;
  const avgSpeed = distanceKm > 0 ? distanceKm / timeHours : 0;
  const rangeKm = avgSpeed > 0 ? (fuelRemainingL / (fuelUsedL / timeHours || 1)) * avgSpeed : 0;

  if (fuelRemainingL < 0) {
    warnings.push('Недостаточно топлива для маршрута');
  } else if (fuelRemainingL < boat.fuelLiters * 0.15) {
    warnings.push('Малый запас топлива (<15%)');
  }

  if (riskySegments.length > 0 && profile === 'safe') {
    warnings.push('Маршрут обходит опасные участки');
  }

  const explanation =
    profile === 'shortest'
      ? 'Выбран кратчайший путь по длине.'
      : profile === 'fast'
        ? 'Приоритет — максимальная скорость на воде и льду.'
        : profile === 'economical'
          ? 'Минимизация расхода топлива.'
          : profile === 'gliding'
            ? 'Поддержание глиссирования, обход мелководья и травы.'
            : 'Приоритет — безопасность и устойчивость.';

  return {
    distanceKm,
    timeMin: timeHours * 60,
    fuelUsedL,
    fuelRemainingL,
    rangeKm: Math.max(rangeKm, 0),
    warnings,
    explanation,
    riskySegments,
  };
}
