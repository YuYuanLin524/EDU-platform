export const DEFAULT_NUMBERS = "9, 5, 2, 7, 1, 8, 3";

export const SPEED_OPTIONS = {
  slow: { label: "慢", durationMs: 1100 },
  medium: { label: "中", durationMs: 750 },
  fast: { label: "快", durationMs: 450 },
} as const;

export type PlaybackSpeed = keyof typeof SPEED_OPTIONS;
