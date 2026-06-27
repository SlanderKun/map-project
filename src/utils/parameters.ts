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

export type RoutingProfile = 'fast' | 'safe';

export const AIRBOAT_PROFILES: Record<RoutingProfile, Record<string, number>> = {
  fast: {
    shallow_water: 1.0,
    ice: 0.8,
    snow: 1.0,
    deep_water: 1.0,
    swamp: 1.2,
    grass: 1.5,
    dirt: 2.0,
    dense_forest: Infinity,
    mountains: Infinity,
  },
  safe: {
    shallow_water: 1.0,
    swamp: 1.0,
    snow: 1.1,
    ice: 1.5,
    deep_water: 1.3,
    grass: 3.0,
    dirt: 4.0,
    dense_forest: Infinity,
    mountains: Infinity,
  },
};