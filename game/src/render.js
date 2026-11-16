// The renderer: a dark starfield, neon prisms, glowing balls and a clear HUD.
// The 960x640 field is letterboxed into whatever window the browser gives it.
import { BALL, BALL_NEUTRAL, FIELD, PADDLE, PRISM } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  // A fixed starfield, so the background never flickers between frames.
  const stars = [];
  let seed = 1234567;
  for (let i = 0; i < 90; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    stars.push({ x: (seed % 960) / 960, y: ((seed >>> 8) % 640) / 640, r: 0.6 + ((seed >>> 16) % 10) / 12 });
  }

  function fit() {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    return scale;
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, '#0b1026');
    gradient.addColorStop(0.6, '#101736');
    gradient.addColorStop(1, '#0a0f22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    for (const star of stars) {
      ctx.beginPath();
      ctx.arc(star.x * FIELD.width, star.y * FIELD.height, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); ctx.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
    }
  }

  function drawBlocks(state) {
    for (const block of state.blocks) {
      if (!block.active) continue;
      const cx = block.x + block.w / 2;
      const cy = block.y + block.h / 2;
      ctx.save();
      ctx.shadowColor = block.color;
      ctx.shadowBlur = block.steel ? 4 : 12;
      ctx.fillStyle = block.color;
      ctx.globalAlpha = block.steel ? 0.55 : block.maxHits === 2 && block.hits === 1 ? 0.65 : 0.92;
      roundedRect(ctx, block.x, block.y, block.w, block.h, 6);
      ctx.fill();
      ctx.restore();
      // A hard block shows its remaining hits as a bright core.
      if (block.maxHits === 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(cx, cy, block.hits === 2 ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (block.steel) {
        ctx.strokeStyle = 'rgba(226,232,240,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(block.x + 10, block.y + block.h / 2);
        ctx.lineTo(block.x + block.w - 10, block.y + block.h / 2);
        ctx.stroke();
      }
    }
  }

  function drawPaddle(state) {
    const paddle = state.paddle;
    const laser = state.time < state.laserUntil;
    ctx.save();
    ctx.shadowColor = laser ? '#f97316' : '#38bdf8';
    ctx.shadowBlur = 16;
    ctx.fillStyle = laser ? '#fb923c' : '#e0f2fe';
    roundedRect(ctx, paddle.x, PADDLE.y, paddle.width, PADDLE.height, 7);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(56,189,248,0.9)';
    ctx.fillRect(paddle.x + paddle.width / 2 - 1, PADDLE.y - 6, 2, 6);
  }

  function drawBalls(state) {
    for (const ball of state.balls) {
      if (!ball.active) continue;
      ctx.save();
      ctx.shadowColor = ball.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(ball.x - 2.5, ball.y - 2.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const POWERUP_STYLE = {
    multi: { label: '3', color: '#f472b6' },
    wide: { label: 'W', color: '#38bdf8' },
    laser: { label: 'L', color: '#fb923c' },
    slow: { label: 'S', color: '#a78bfa' },
    life: { label: '+', color: '#4ade80' },
  };

  function drawPowerups(state) {
    for (const p of state.powerups) {
      if (!p.active) continue;
      const style = POWERUP_STYLE[p.kind];
      ctx.save();
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2;
      roundedRect(ctx, p.x - 13, p.y - 11, 26, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = style.color;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.label, p.x, p.y + 1);
    }
    for (const laser of state.lasers) {
      if (!laser.active) continue;
      ctx.save();
      ctx.shadowColor = '#fb923c';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(laser.x - 2, laser.y - 12, 4, 14);
      ctx.restore();
    }
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(2,6,23,0.55)';
    ctx.fillRect(0, 0, FIELD.width, 44);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SCORE ${state.score}`, 16, 23);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 200, 23);
    // Lives as pips.
    for (let i = 0; i < state.lives; i += 1) {
      ctx.save();
      ctx.shadowColor = '#f472b6';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(FIELD.width - 170 + i * 24, 23, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`LEVEL ${state.level}`, FIELD.width - 16, 23);
    // The chain multiplier and the ball's current colour.
    const ball = state.balls.find((b) => b.active);
    if (ball) {
      const label = state.chain > 1 ? `CHAIN x${state.chain}` : 'CHAIN x1';
      ctx.fillStyle = state.chain > 1 ? '#fbbf24' : '#94a3b8';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, FIELD.width / 2, 23);
      ctx.save();
      ctx.shadowColor = ball.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(FIELD.width / 2 + 52, 23, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Active power-up timers as small bars under the HUD.
    let barX = 16;
    const bars = [];
    if (state.time < state.wideUntil) bars.push({ label: 'WIDE', left: state.wideUntil - state.time, total: 12, color: '#38bdf8' });
    if (state.time < state.slowUntil) bars.push({ label: 'SLOW', left: state.slowUntil - state.time, total: 8, color: '#a78bfa' });
    if (state.time < state.laserUntil) bars.push({ label: 'LASER', left: state.laserUntil - state.time, total: 10, color: '#fb923c' });
    for (const bar of bars) {
      ctx.fillStyle = 'rgba(2,6,23,0.55)';
      ctx.fillRect(barX, 50, 74, 12);
      ctx.fillStyle = bar.color;
      ctx.fillRect(barX, 50, 74 * Math.max(0, bar.left / bar.total), 12);
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bar.label, barX + 37, 56);
      barX += 82;
    }
  }

  function centerText(lines, y) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const line of lines) {
      ctx.fillStyle = line.color;
      ctx.font = line.font;
      if (line.glow) {
        ctx.save();
        ctx.shadowColor = line.glow;
        ctx.shadowBlur = 24;
        ctx.fillText(line.text, FIELD.width / 2, y);
        ctx.restore();
      } else {
        ctx.fillText(line.text, FIELD.width / 2, y);
      }
      y += line.gap;
    }
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(2,6,23,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    centerText([
      { text: 'SPECTRA', font: 'bold 84px system-ui, sans-serif', color: '#e0f2fe', glow: '#38bdf8', gap: 92 },
      { text: 'a prism breakout', font: '22px system-ui, sans-serif', color: '#94a3b8', gap: 52 },
      { text: 'Break the prisms. Match the ball colour for double points', font: '17px system-ui, sans-serif', color: '#e2e8f0', gap: 28 },
      { text: 'and grow your chain. Catch falling power-ups. Clear 3 levels.', font: '17px system-ui, sans-serif', color: '#e2e8f0', gap: 44 },
      { text: 'MOUSE or ARROW KEYS move  ·  CLICK or ENTER to start', font: 'bold 16px system-ui, sans-serif', color: '#fbbf24', gap: 30 },
      { text: 'P pause  ·  M mute  ·  R restart', font: '15px system-ui, sans-serif', color: '#94a3b8', gap: 44 },
      { text: best > 0 ? `BEST ${best}` : 'No best score yet — set one.', font: '15px system-ui, sans-serif', color: '#94a3b8', gap: 0 },
    ], 168);
    // The four prism colours as a legend row.
    const keys = ['cyan', 'magenta', 'amber', 'green'];
    keys.forEach((key, i) => {
      const x = FIELD.width / 2 - 90 + i * 60;
      ctx.save();
      ctx.shadowColor = PRISM[key];
      ctx.shadowBlur = 14;
      ctx.fillStyle = PRISM[key];
      roundedRect(ctx, x, 470, 44, 22, 5);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(2,6,23,0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    centerText([
      { text: 'PAUSED', font: 'bold 56px system-ui, sans-serif', color: '#e0f2fe', glow: '#38bdf8', gap: 64 },
      { text: 'Press P to keep playing', font: '18px system-ui, sans-serif', color: '#94a3b8', gap: 0 },
    ], 280);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(2,6,23,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    centerText([
      { text: 'GAME OVER', font: 'bold 64px system-ui, sans-serif', color: '#fda4af', glow: '#f43f5e', gap: 72 },
      { text: `SCORE ${state.score}`, font: 'bold 28px system-ui, sans-serif', color: '#f1f5f9', gap: 40 },
      { text: `BEST ${Math.max(best, state.score)}`, font: '18px system-ui, sans-serif', color: '#94a3b8', gap: 48 },
      { text: 'Press R or click to play again', font: 'bold 18px system-ui, sans-serif', color: '#fbbf24', gap: 0 },
    ], 220);
  }

  function drawWin(state, best) {
    ctx.fillStyle = 'rgba(2,6,23,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    centerText([
      { text: 'YOU WIN!', font: 'bold 72px system-ui, sans-serif', color: '#bef264', glow: '#a3e635', gap: 80 },
      { text: 'Every prism shattered. The spectrum is yours.', font: '19px system-ui, sans-serif', color: '#e2e8f0', gap: 48 },
      { text: `FINAL SCORE ${state.score}`, font: 'bold 28px system-ui, sans-serif', color: '#f1f5f9', gap: 40 },
      { text: `BEST ${Math.max(best, state.score)}`, font: '18px system-ui, sans-serif', color: '#94a3b8', gap: 48 },
      { text: 'Press R or click to play again', font: 'bold 18px system-ui, sans-serif', color: '#fbbf24', gap: 0 },
    ], 200);
  }

  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = fit();
    void scale;
    ctx.save();
    if (state.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground();
    drawBlocks(state);
    drawPaddle(state);
    drawBalls(state);
    drawPowerups(state);
    drawParticles(state);
    if (screen === SCREEN_TITLE) {
      // The title floats over a live field so the game is visible behind it.
      drawTitle(state, best);
    } else if (screen === SCREEN_PAUSED) {
      drawHud(state, best);
      drawPaused();
    } else if (screen === SCREEN_OVER) {
      drawOver(state, best);
    } else if (screen === SCREEN_WIN) {
      drawWin(state, best);
    } else {
      drawHud(state, best);
    }
    ctx.restore();
  }

  function resize(width, height) {
    canvas.width = width;
    canvas.height = height;
  }

  return { draw, resize };
}
