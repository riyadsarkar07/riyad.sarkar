export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeOut = [0.22, 1, 0.36, 1] as const;
export const easeOutBack = [0.34, 1.2, 0.64, 1] as const;

export const duration = {
  fast: 0.22,
  base: 0.4,
  slow: 0.62,
  cinematic: 0.85,
} as const;

export const stagger = {
  fast: 0.035,
  base: 0.055,
  slow: 0.09,
} as const;

export const viewportOnce = {
  once: true,
  margin: "-64px",
  amount: 0.16,
} as const;
