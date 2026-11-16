# makefun-best-game

[![Make the best game](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/apidm22/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/apidm22/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01)

**SPECTRA** — a neon prism breakout. Break coloured prisms with a bouncing ball. The ball takes the colour of the last prism it broke: hit a prism of the ball's own colour and it pays double points and grows your chain (up to x8). Hit another colour and the chain resets and the ball takes that colour. Catch falling power-ups (multi-ball, wide paddle, laser, slow-mo, extra life) and clear all three levels to win.

## How to play

- **Move:** mouse, or the arrow keys / A, D
- **Launch / start:** click, or Space / Enter
- **Pause:** P · **Mute:** M · **Restart:** R

Three lives. Lose one when every ball falls past the paddle. Clear Level 3 to win — the final level guards its core with steel prisms that never break and hard prisms that take two hits.

## Run it

```bash
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network — the game is pure HTML, CSS and vanilla JavaScript on Canvas, with WebAudio bleeps.

## Layout

- `game/index.html` — the page, a full-window canvas
- `game/src/config.js` — tunables and prism colours
- `game/src/random.js` — seeded random (deterministic `?seed=N` runs)
- `game/src/audio.js` — tiny WebAudio synth, no audio files
- `game/src/input.js` — keyboard + mouse
- `game/src/world.js` — physics, levels, scoring, power-ups
- `game/src/render.js` — neon renderer, HUD, title / pause / game-over / win screens
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|end`)
- `game/src/main.js` — boot and fixed-step game loop
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — a tiny static server for local play
- `screenshots/` — three real renders of the game (title, play, game over)

Entered on [make.fun](https://make.fun/?ref=zas5j55a) for the [Make the best game](https://make.fun/bounty/best-game-01) bounty.
