export type TerrainType =
  | 'deep_water'
  | 'shallow_water'
  | 'ice'
  | 'snow'
  | 'swamp'
  | 'grass'
  | 'dirt'
  | 'dense_forest'
  | 'mountains'
  | string;

export type RoutingProfile =
  | 'fast'
  | 'economical'
  | 'shortest'
  | 'safe'
  | 'gliding';

export type BoatVariant = 'base' | 'inflatable';
export type LoadLevel = 'light' | 'medium' | 'heavy';

export interface BoatSettings {
  variant: BoatVariant;
  load: LoadLevel;
  fuelLiters: number;
}

export const PROFILE_LABELS: Record<RoutingProfile, string> = {
  fast: 'Быстрый',
  economical: 'Экономичный',
  shortest: 'Кратчайший',
  safe: 'Безопасный',
  gliding: 'Глиссирование',
};

export const ROUTING_PROFILES: RoutingProfile[] = [
  'fast',
  'economical',
  'shortest',
  'safe',
  'gliding',
];

/** Множители опасности для безопасного режима */
export const SAFE_TERRAIN_COST: Record<string, number> = {
  shallow_water: 1.0,
  swamp: 1.0,
  snow: 1.1,
  ice: 1.5,
  deep_water: 1.3,
  grass: 3.0,
  dirt: 4.0,
  dense_forest: Infinity,
  mountains: Infinity,
};

/** Относительная скорость, км/ч (база Raptor 650 ≈ 45 на воде) */
export const TERRAIN_SPEED_KMH: Record<string, number> = {
  shallow_water: 45,
  deep_water: 40,
  ice: 35,
  snow: 30,
  swamp: 22,
  grass: 18,
  dirt: 12,
  dense_forest: 0,
  mountains: 0,
};

/** Относительный расход топлива, л/ч при крейсере */
export const TERRAIN_FUEL_LPH: Record<string, number> = {
  shallow_water: 28,
  deep_water: 32,
  ice: 30,
  snow: 33,
  swamp: 35,
  grass: 42,
  dirt: 48,
  dense_forest: Infinity,
  mountains: Infinity,
};

/** Террейны, где глиссирование теряется */
export const GLIDE_BREAK_TERRAINS = new Set([
  'grass',
  'dirt',
  'swamp',
  'dense_forest',
  'mountains',
]);

export const LOAD_FACTORS: Record<LoadLevel, { speed: number; fuel: number }> = {
  light: { speed: 1.05, fuel: 0.92 },
  medium: { speed: 1.0, fuel: 1.0 },
  heavy: { speed: 0.88, fuel: 1.15 },
};

export const INFLATABLE_FACTORS = {
  speed: 0.95,
  fuel: 1.08,
  passability: 0.85,
};

export const MODE_FACTORS: Record<RoutingProfile, { speed: number; fuel: number }> = {
  fast: { speed: 1.15, fuel: 1.25 },
  economical: { speed: 0.82, fuel: 0.78 },
  shortest: { speed: 1.0, fuel: 1.0 },
  safe: { speed: 0.9, fuel: 1.05 },
  gliding: { speed: 1.05, fuel: 1.1 },
};

/** @deprecated используйте SAFE_TERRAIN_COST */
export const AIRBOAT_PROFILES = {
  fast: Object.fromEntries(
    Object.entries(TERRAIN_SPEED_KMH).map(([k, v]) => [k, v > 0 ? 45 / v : Infinity]),
  ),
  safe: SAFE_TERRAIN_COST,
};
