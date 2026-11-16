// The world: paddle, balls, prism blocks, power-ups, particles and scoring.
// A fixed-step simulation (STEP seconds per step) so a seeded run is exact.
//
// The colour rule: the ball takes the colour of the last block it broke. Hit a
// block of the ball's own colour and it pays double and grows the chain; hit
// another colour and the chain resets to one and the ball takes that colour.
// A white ball is neutral: it never matches, and always takes the colour.
import {
  BALL,
  BALL_NEUTRAL,
  BLOCK_POINTS,
  FIELD,
  LEVEL_BONUS,
  LIFE_BONUS,
  LIVES_MAX,
  LIVES_START,
  PADDLE,
  POWERUP_CHANCE,
  POWERUP_FALL_SPEED,
  POWERUP_KINDS,
  PRISM,
  PRISM_KEYS,
  STEP,
  TIMERS,
} from './config.js';
import { pick } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_BREAK = 2;
export const EVENT_MATCH = 4;
export const EVENT_POWER = 8;
export const EVENT_LOSE = 16;
export const EVENT_LEVEL = 32;
export const EVENT_OVER = 64;
export const EVENT_WIN = 128;

const BLOCK_W = 84;
const BLOCK_H = 26;
const BLOCK_GAP = 8;
const GRID_TOP = 86;

// Level maps: C cyan, M magenta, A amber, G green, H hard (2 hits), S steel.
const LEVELS = [
  [
    '....CCCC....',
    '...MMMMMM...',
    '..AAAAAAAA..',
    '.GGGGGGGGGG.',
    'CCCCCCCCCCCC',
    'MMMMMMMMMMMM',
  ],
  [
    'S..CCCCCC..S',
    '.MHHHHHHHHM.',
    '..AAAAAAAA..',
    '.GGGGGGGGGG.',
    'CCHHHHHHHHCC',
    'MMMMMMMMMMMM',
    '..AAAAAAAA..',
  ],
  [
    '....SSSS....',
    '..HHHHHHHH..',
    '.CCHHHHHHCC.',
    'MMHHCCCC HHMM',
    'AAGGHHHHGGAA',
    'CCGGCCCCGGCC',
    'MMMMMMMMMMMM',
  ],
];

function buildBlocks(levelIndex, random) {
  const rows = LEVELS[levelIndex];
  const blocks = [];
  const cols = rows[0].length;
  const gridW = cols * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP;
  const startX = (FIELD.width - gridW) / 2;
  for (let r = 0; r < rows.length; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const ch = rows[r][c];
      if (ch === '.' || ch === ' ') continue;
      const steel = ch === 'S';
      const hard = ch === 'H';
      const key = ch === 'C' ? 'cyan' : ch === 'M' ? 'magenta' : ch === 'A' ? 'amber' : ch === 'G' ? 'green' : hard ? pick(random, PRISM_KEYS) : 'cyan';
      blocks.push({
        x: startX + c * (BLOCK_W + BLOCK_GAP),
        y: GRID_TOP + r * (BLOCK_H + BLOCK_GAP),
        w: BLOCK_W,
        h: BLOCK_H,
        color: steel ? '#94a3b8' : PRISM[key],
        key: steel ? 'steel' : key,
        hits: steel ? Infinity : hard ? 2 : 1,
        maxHits: steel ? Infinity : hard ? 2 : 1,
        active: true,
        steel,
      });
    }
  }
  return blocks;
}

function freshBall(paddleX, level) {
  const speed = Math.min(BALL.baseSpeed + (level - 1) * BALL.speedPerLevel, BALL.maxSpeed);
  return {
    x: paddleX,
    y: PADDLE.y - BALL.radius - 2,
    vx: speed * 0.45,
    vy: -speed * 0.89,
    speed,
    color: BALL_NEUTRAL,
    stuck: true,
    active: true,
  };
}

export function createWorld(random) {
  const state = {
    level: 1,
    score: 0,
    chain: 1,
    lives: LIVES_START,
    balls: [],
    blocks: [],
    powerups: [],
    lasers: [],
    particles: [],
    paddle: { x: FIELD.width / 2 - PADDLE.width / 2, width: PADDLE.width },
    wideUntil: 0,
    slowUntil: 0,
    laserUntil: 0,
    stuckTimer: 0,
    shake: 0,
    time: 0,
    levelJustCleared: false,
    over: false,
    won: false,
  };

  function loadLevel(index) {
    state.level = index;
    state.blocks = buildBlocks(index - 1, random);
    state.powerups = [];
    state.lasers = [];
    state.balls = [freshBall(state.paddle.x + state.paddle.width / 2, index)];
    state.levelJustCleared = false;
  }

  function reset() {
    state.score = 0;
    state.chain = 1;
    state.lives = LIVES_START;
    state.wideUntil = 0;
    state.slowUntil = 0;
    state.laserUntil = 0;
    state.stuckTimer = 0;
    state.shake = 0;
    state.time = 0;
    state.over = false;
    state.won = false;
    state.paddle.x = FIELD.width / 2 - PADDLE.width / 2;
    state.paddle.width = PADDLE.width;
    loadLevel(1);
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 60 + random() * 220;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.35 + random() * 0.4,
        maxLife: 0.75,
        color,
        size: 2 + random() * 3,
      });
    }
  }

  function maybeDropPowerup(x, y) {
    if (random() > POWERUP_CHANCE) return;
    state.powerups.push({ x, y, vy: POWERUP_FALL_SPEED, kind: pick(random, POWERUP_KINDS), active: true });
  }

  function applyPowerup(kind) {
    if (kind === 'multi') {
      const actives = state.balls.filter((b) => b.active && !b.stuck);
      const extra = [];
      for (const b of actives) {
        if (state.balls.length + extra.length >= 6) break;
        for (const angle of [-0.5, 0.5]) {
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          extra.push({
            x: b.x, y: b.y,
            vx: b.vx * cos - b.vy * sin,
            vy: b.vx * sin + b.vy * cos,
            speed: b.speed, color: b.color, stuck: false, active: true,
          });
        }
      }
      state.balls.push(...extra.slice(0, 6 - state.balls.length));
    } else if (kind === 'wide') {
      state.wideUntil = state.time + TIMERS.wideSeconds;
      state.paddle.width = PADDLE.wideWidth;
    } else if (kind === 'laser') {
      state.laserUntil = state.time + TIMERS.laserSeconds;
    } else if (kind === 'slow') {
      state.slowUntil = state.time + TIMERS.slowSeconds;
    } else if (kind === 'life') {
      state.lives = Math.min(state.lives + 1, LIVES_MAX);
    }
  }

  function breakBlock(block, ball) {
    block.active = false;
    const matched = ball.color !== BALL_NEUTRAL && ball.color === block.color;
    const mult = matched ? 2 * state.chain : 1;
    state.score += BLOCK_POINTS * mult;
    if (matched) state.chain = Math.min(state.chain + 1, 8);
    else state.chain = 1;
    ball.color = block.color;
    spawnParticles(block.x + block.w / 2, block.y + block.h / 2, block.color, matched ? 18 : 10);
    state.shake = Math.max(state.shake, matched ? 7 : 4);
    maybeDropPowerup(block.x + block.w / 2, block.y + block.h / 2);
    return matched ? EVENT_BREAK | EVENT_MATCH : EVENT_BREAK;
  }

  function circleRect(ball, rect) {
    const cx = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
    const cy = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    return dx * dx + dy * dy <= BALL.radius * BALL.radius;
  }

  function step(dt, move, launched) {
    let events = 0;
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 22);

    // Paddle.
    const paddle = state.paddle;
    paddle.x += move * PADDLE.speed * dt;
    paddle.x = Math.max(0, Math.min(FIELD.width - paddle.width, paddle.x));
    if (state.wideUntil > 0 && state.time > state.wideUntil) {
      state.wideUntil = 0;
      paddle.width = PADDLE.width;
      paddle.x = Math.max(0, Math.min(FIELD.width - paddle.width, paddle.x));
    }

    const slow = state.time < state.slowUntil;
    const timeScale = slow ? 0.6 : 1;

    // Launch a stuck ball: at once on a confirm, or on its own after a beat,
    // so the game never sits still waiting for a click the player missed.
    let anyStuck = false;
    for (const ball of state.balls) {
      if (ball.stuck) {
        anyStuck = true;
        ball.x = paddle.x + paddle.width / 2;
        ball.y = PADDLE.y - BALL.radius - 2;
        if (launched) ball.stuck = false;
      }
    }
    if (anyStuck) {
      state.stuckTimer += dt;
      if (state.stuckTimer >= 1.0) {
        for (const ball of state.balls) ball.stuck = false;
        state.stuckTimer = 0;
      }
    } else {
      state.stuckTimer = 0;
    }

    // Laser bolts, fired automatically while the power-up lasts.
    if (state.time < state.laserUntil) {
      state.laserCooldown = (state.laserCooldown || 0) - dt;
      if (state.laserCooldown <= 0) {
        state.laserCooldown = TIMERS.laserShotSeconds;
        state.lasers.push({ x: paddle.x + paddle.width / 2, y: PADDLE.y - 10, vy: -520, active: true });
      }
    }
    for (const laser of state.lasers) {
      if (!laser.active) continue;
      laser.y += laser.vy * dt;
      if (laser.y < 0) { laser.active = false; continue; }
      for (const block of state.blocks) {
        if (!block.active) continue;
        if (laser.x >= block.x && laser.x <= block.x + block.w && laser.y >= block.y && laser.y <= block.y + block.h) {
          laser.active = false;
          if (!block.steel) {
            block.hits -= 1;
            if (block.hits <= 0) {
              const dummy = { color: BALL_NEUTRAL };
              events |= breakBlock(block, dummy);
            } else {
              spawnParticles(laser.x, laser.y, block.color, 4);
            }
          }
          break;
        }
      }
    }

    // Balls.
    for (const ball of state.balls) {
      if (!ball.active || ball.stuck) continue;
      ball.x += ball.vx * timeScale * dt;
      ball.y += ball.vy * timeScale * dt;
      // Walls.
      if (ball.x - BALL.radius < 0) { ball.x = BALL.radius; ball.vx = Math.abs(ball.vx); events |= EVENT_HIT; }
      if (ball.x + BALL.radius > FIELD.width) { ball.x = FIELD.width - BALL.radius; ball.vx = -Math.abs(ball.vx); events |= EVENT_HIT; }
      if (ball.y - BALL.radius < 0) { ball.y = BALL.radius; ball.vy = Math.abs(ball.vy); events |= EVENT_HIT; }
      // Paddle.
      if (ball.vy > 0 && ball.y + BALL.radius >= PADDLE.y && ball.y - BALL.radius <= PADDLE.y + PADDLE.height
        && ball.x >= paddle.x - BALL.radius && ball.x <= paddle.x + paddle.width + BALL.radius) {
        const rel = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        const angle = rel * (Math.PI / 3);
        const speed = Math.min(ball.speed + state.time * 0.15, BALL.maxSpeed);
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.cos(angle) * speed;
        ball.y = PADDLE.y - BALL.radius - 1;
        events |= EVENT_HIT;
      }
      // Blocks.
      for (const block of state.blocks) {
        if (!block.active || !circleRect(ball, block)) continue;
        const prevVy = ball.vy;
        const fromTop = ball.y - BALL.radius < block.y;
        const fromBottom = ball.y + BALL.radius > block.y + block.h;
        if (fromTop && prevVy > 0) ball.vy = -Math.abs(ball.vy);
        else if (fromBottom && prevVy < 0) ball.vy = Math.abs(ball.vy);
        else ball.vx = -ball.vx;
        if (block.steel) {
          events |= EVENT_HIT;
        } else {
          block.hits -= 1;
          if (block.hits <= 0) events |= breakBlock(block, ball);
          else { spawnParticles(ball.x, ball.y, block.color, 5); events |= EVENT_HIT; }
        }
        break;
      }
      // Fell out.
      if (ball.y - BALL.radius > FIELD.height) ball.active = false;
    }
    state.balls = state.balls.filter((b) => b.active);

    // All balls lost: lose a life, or the game.
    if (state.balls.length === 0 && !state.over && !state.won) {
      state.lives -= 1;
      state.chain = 1;
      events |= EVENT_LOSE;
      if (state.lives <= 0) {
        state.over = true;
        events |= EVENT_OVER;
      } else {
        state.balls = [freshBall(paddle.x + paddle.width / 2, state.level)];
      }
    }

    // Power-ups fall and are caught by the paddle.
    for (const p of state.powerups) {
      if (!p.active) continue;
      p.y += p.vy * dt;
      if (p.y > FIELD.height) { p.active = false; continue; }
      if (p.y + 10 >= PADDLE.y && p.y <= PADDLE.y + PADDLE.height && p.x >= paddle.x - 8 && p.x <= paddle.x + paddle.width + 8) {
        p.active = false;
        applyPowerup(p.kind);
        events |= EVENT_POWER;
      }
    }
    state.powerups = state.powerups.filter((p) => p.active);
    state.lasers = state.lasers.filter((l) => l.active);

    // Particles fade.
    for (const pt of state.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 260 * dt;
    }
    state.particles = state.particles.filter((pt) => pt.life > 0);

    // Level cleared: every breakable block gone.
    const remaining = state.blocks.some((b) => b.active && !b.steel);
    if (!remaining && !state.over && !state.won && !state.levelJustCleared) {
      state.levelJustCleared = true;
      state.score += LEVEL_BONUS + state.lives * LIFE_BONUS;
      events |= EVENT_LEVEL;
      if (state.level >= LEVELS.length) {
        state.won = true;
        events |= EVENT_WIN;
      } else {
        loadLevel(state.level + 1);
      }
    }
    return events;
  }

  reset();
  return { state, reset, loadLevel, step, levels: LEVELS.length };
}
