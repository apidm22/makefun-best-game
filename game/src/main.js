// SPECTRA — boot and game loop.
//
// ?shot=start|play|end&seed=N stages a deterministic screenshot scene and
// sets window.__shotReady when the frame is painted. Without ?shot= it runs
// the interactive game: title, play, pause, level clear, game over, victory.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRandom } from './random.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { EVENT_BREAK, EVENT_LEVEL, EVENT_LOSE, EVENT_MATCH, EVENT_OVER, EVENT_POWER, EVENT_WIN, createWorld } from './world.js';

const canvas = document.getElementById('game');

function readParams() {
  const params = new URLSearchParams(window.location.search);
  return { shot: params.get('shot'), seed: Number(params.get('seed') || '1') };
}

function main() {
  const { shot, seed } = readParams();
  const random = createRandom(seed);
  const renderer = createRenderer(canvas);
  const world = createWorld(random);
  const audio = createAudio();

  function fitCanvas() {
    renderer.resize(window.innerWidth, window.innerHeight);
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  let best = 0;
  try {
    best = Number(window.localStorage.getItem(BEST_KEY) || '0') || 0;
  } catch {
    best = 0;
  }
  function saveBest() {
    if (world.state.score > best) {
      best = world.state.score;
      try {
        window.localStorage.setItem(BEST_KEY, String(best));
      } catch {
        // Best score is a nicety; a storage failure never stops the game.
      }
    }
  }

  if (shot) {
    // Screenshot mode: stage the scene, paint twice, signal readiness.
    const screen = stageShot(shot, world);
    renderer.draw(world.state, screen, best);
    renderer.draw(world.state, screen, best);
    window.__shotReady = true;
    return;
  }

  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let banner = null; // { text, until } — a transient level-clear message.

  function startGame() {
    world.reset();
    screen = SCREEN_PLAY;
    banner = null;
  }

  function launchIfStuck() {
    return world.state.balls.some((b) => b.stuck);
  }

  function handleEvents(events) {
    if (events & EVENT_BREAK) audio.breakBlock(Boolean(events & EVENT_MATCH));
    if (events & EVENT_POWER) audio.power();
    if (events & EVENT_LOSE) audio.loseLife();
    if (events & EVENT_LEVEL) {
      audio.levelClear();
      banner = { text: `LEVEL ${world.state.level - 1} CLEAR!`, until: world.state.time + 1.4 };
    }
    if (events & EVENT_WIN) {
      audio.win();
      screen = SCREEN_WIN;
      saveBest();
    }
    if (events & EVENT_OVER) {
      screen = SCREEN_OVER;
      saveBest();
    }
  }

  function canvasToFieldX(clientX) {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    return (clientX - ox) / scale;
  }

  function tick(dt) {
    const actions = input.poll();
    if (actions.has(ACTION_MUTE)) audio.setMuted(!audio.isMuted());
    if (actions.has(ACTION_RESTART)) {
      audio.unlock();
      startGame();
      return;
    }
    if (screen === SCREEN_TITLE) {
      if (actions.has(ACTION_CONFIRM)) {
        audio.unlock();
        startGame();
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions.has(ACTION_PAUSE) || actions.has(ACTION_CONFIRM)) screen = SCREEN_PLAY;
      return;
    }
    if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions.has(ACTION_CONFIRM)) {
        audio.unlock();
        startGame();
      }
      return;
    }
    // Playing.
    if (actions.has(ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      return;
    }
    if (actions.has(ACTION_CONFIRM)) audio.unlock();

    // Paddle: the mouse overrides the keys when it has moved.
    let move = input.steer();
    if (input.mouseUsed()) {
      const rect = canvas.getBoundingClientRect();
      const fieldX = canvasToFieldX(input.mouseX() + rect.left - rect.left);
      const target = fieldX - world.state.paddle.width / 2;
      const diff = target - world.state.paddle.x;
      move = Math.max(-1, Math.min(1, diff / 24));
    }
    const launched = launchIfStuck() && actions.has(ACTION_CONFIRM);
    const events = world.step(dt, move, launched);
    handleEvents(events);
    if (banner && world.state.time > banner.until) banner = null;
  }

  function drawBanner() {
    if (!banner) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 18;
    ctx.fillText(banner.text, canvas.width / 2, 130);
    ctx.restore();
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    while (acc >= STEP) {
      tick(STEP);
      acc -= STEP;
    }
    renderer.draw(world.state, screen, best);
    drawBanner();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
