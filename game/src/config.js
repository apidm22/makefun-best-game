// SPECTRA — a neon prism breakout. Tunables and shared constants.
// The field is a fixed 960x640 arena, letterboxed into the browser window.
export const FIELD = { width: 960, height: 640 };
export const STEP = 1 / 60;
export const BEST_KEY = 'spectra_best';

// The four prism colours. A ball takes the colour of the last block it broke;
// breaking a block of the ball's own colour pays double and grows the chain.
export const PRISM = {
  cyan: '#22d3ee',
  magenta: '#f472b6',
  amber: '#fbbf24',
  green: '#4ade80',
};
export const PRISM_KEYS = ['cyan', 'magenta', 'amber', 'green'];
export const BALL_NEUTRAL = '#f8fafc';

export const PADDLE = {
  width: 112,
  wideWidth: 156,
  height: 14,
  y: 600,
  speed: 560,
};

export const BALL = {
  radius: 8,
  baseSpeed: 400,
  speedPerLevel: 34,
  maxSpeed: 640,
};

export const LIVES_START = 3;
export const LIVES_MAX = 5;

// Points for one block, before the colour-match and chain multipliers.
export const BLOCK_POINTS = 50;
export const LEVEL_BONUS = 500;
export const LIFE_BONUS = 100;

// A falling power-up drops from roughly one in five broken blocks.
export const POWERUP_CHANCE = 0.18;
export const POWERUP_FALL_SPEED = 150;
export const POWERUP_KINDS = ['multi', 'wide', 'laser', 'slow', 'life'];

export const TIMERS = {
  wideSeconds: 12,
  slowSeconds: 8,
  laserSeconds: 10,
  laserShotSeconds: 0.8,
};
