export const easeOutExpo = [0.22, 1, 0.36, 1] as const;
export const easeOutBack = [0.34, 1.56, 0.64, 1] as const;

export const duration = {
  fast: 0.35,
  base: 0.55,
  slow: 0.85,
  cinematic: 1.05,
} as const;

export const stagger = {
  fast: 0.05,
  base: 0.08,
  slow: 0.12,
} as const;

export const viewportOnce = {
  once: true,
  margin: "-56px",
  amount: 0.12,
} as const;
