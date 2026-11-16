// SPECTRA — the make.fun entrypoint.
//
// Copies the static game and the screenshots into /output and writes the
// dossier.json the judges read, with the vendored make.fun library. The
// dossier is built from the files themselves: buildDossier reads game/ and
// screenshots/ out of the output directory and writes a canonical summary
// (a "## Game" block, then the source files in load order).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function main() {
  const gameDir = join(here, 'game');
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(gameDir)) throw new Error(`game/ is missing: ${gameDir}`);
  if (!existsSync(shotsDir)) throw new Error(`screenshots/ is missing: ${shotsDir}`);

  // A quick pre-flight so a bad tree fails here with a plain message instead
  // of inside buildDossier: the game must have an index.html, and the shots
  // must be 3 or 4 real renders, each under 256 KiB.
  if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');
  const shots = readdirSync(shotsDir).filter((name) => /\.(png|jpe?g)$/i.test(name)).sort();
  if (shots.length < 3 || shots.length > 4) throw new Error(`expected 3-4 screenshots, found ${shots.length}`);
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > 256 * 1024) throw new Error(`screenshots/${name} is ${size} bytes (max 256 KiB)`);
  }

  mkdirSync(out, { recursive: true });
  cpSync(gameDir, join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

  const dossier = buildDossier(out, CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`Wrote ${join(out, 'dossier.json')} (${dossier.length} bytes) with ${shots.length} screenshots.`);
}

main();
