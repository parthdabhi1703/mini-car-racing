export const PLAYER_CARS = [
  {
    id: 'crimson',
    name: 'Crimson GT',
    body: '#ef4444',
    accent: '#ffffff',
    dark: '#991b1b',
    glow: 'rgba(239, 68, 68, 0.45)',
  },
  {
    id: 'cobalt',
    name: 'Cobalt RS',
    body: '#3b82f6',
    accent: '#bae6fd',
    dark: '#1e3a8a',
    glow: 'rgba(59, 130, 246, 0.45)',
  },
  {
    id: 'venom',
    name: 'Venom Lime',
    body: '#22c55e',
    accent: '#dcfce7',
    dark: '#14532d',
    glow: 'rgba(34, 197, 94, 0.45)',
  },
  {
    id: 'solar',
    name: 'Solar Gold',
    body: '#f59e0b',
    accent: '#fef3c7',
    dark: '#92400e',
    glow: 'rgba(245, 158, 11, 0.45)',
  },
];

export const ENEMY_TYPES = [
  {
    kind: 'sedan',
    width: 46,
    height: 86,
    speedFactor: 0.48,
    colors: ['#64748b', '#94a3b8', '#0ea5e9', '#a855f7', '#eab308'],
  },
  {
    kind: 'sport',
    width: 46,
    height: 90,
    speedFactor: 0.64,
    colors: ['#f97316', '#ec4899', '#14b8a6'],
  },
  {
    kind: 'truck',
    width: 54,
    height: 126,
    speedFactor: 0.36,
    colors: ['#475569', '#334155', '#6b7280'],
  },
];

export const STORAGE_KEYS = {
  HIGH_SCORE: 'apex_rush_high_score',
  CAR_ID: 'apex_rush_car_id',
  MUTED: 'apex_rush_muted',
};
