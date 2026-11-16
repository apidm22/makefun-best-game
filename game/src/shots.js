// Deterministic scene staging for the three screenshots. Every scene plays the
// real simulation forward with a seeded random, so the renders are honest
// frames of the game itself — never a composed mock-up.
import { PADDLE, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

// Where will this ball be when it reaches the paddle? Reflect off the walls.
function predictLandingX(ball) {
  if (ball.vy <= 0) return ball.x;
  const t = (PADDLE.y - ball.y) / ball.vy;
  let x = ball.x + ball.vx * t;
  const w = 960;
  x = ((x % (2 * w)) + 2 * w) % (2 * w);
  return x > w ? 2 * w - x : x;
}

// Good autopilot: chase the most urgent falling ball at full paddle speed.
// Bad autopilot: chase the same target at a third of the speed, so it misses.
function autopilot(state, good) {
  const falling = state.balls.filter((b) => b.active && !b.stuck && b.vy > 0);
  if (falling.length === 0) return 0;
  let target = null;
  let bestTime = Infinity;
  for (const ball of falling) {
    const t = (PADDLE.y - ball.y) / ball.vy;
    if (t < bestTime) {
      bestTime = t;
      target = predictLandingX(ball);
    }
  }
  const center = state.paddle.x + state.paddle.width / 2;
  const diff = target - center;
  if (Math.abs(diff) < 4) return 0;
  return Math.sign(diff) * (good ? 1 : 0.33);
}

function playForward(world, good, maxSteps) {
  for (let i = 0; i < maxSteps; i += 1) {
    const anyStuck = world.state.balls.some((b) => b.stuck);
    world.step(STEP, autopilot(world.state, good), anyStuck);
    if (world.state.over || world.state.won) return true;
  }
  return false;
}

export function stageShot(name, world) {
  if (name === 'start') {
    // A fresh field under the title screen.
    world.reset();
    return SCREEN_TITLE;
  }
  if (name === 'play') {
    // Fourteen seconds of good play: blocks breaking, chain growing.
    world.reset();
    playForward(world, true, 14 * 60);
    return SCREEN_PLAY;
  }
  // 'end': a slow paddle that keeps missing until all three lives are gone.
  world.reset();
  let finished = playForward(world, false, 90 * 60);
  if (!finished) {
    // Fallback: park the paddle and let the balls drop.
    for (let i = 0; i < 60 * 60 && !world.state.over; i += 1) {
      const anyStuck = world.state.balls.some((b) => b.stuck);
      world.step(STEP, 0, anyStuck);
    }
  }
  return SCREEN_OVER;
}
