// Keyboard + mouse, read once per frame. Actions are edge-triggered: the
// game loop calls poll() each frame and gets what was pressed since last time.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';

export function createInput(canvas) {
  const keys = new Set();
  let mouseX = null;
  let clicked = false;
  let pressed = new Set();

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') pressed.add(ACTION_CONFIRM);
    if (event.code === 'KeyP') pressed.add(ACTION_PAUSE);
    if (event.code === 'KeyM') pressed.add(ACTION_MUTE);
    if (event.code === 'KeyR') pressed.add(ACTION_RESTART);
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    clicked = true;
    pressed.add(ACTION_CONFIRM);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    // -1, 0 or 1 from the arrow keys / A,D; the mouse overrides when moved.
    steer() {
      const left = keys.has('ArrowLeft') || keys.has('KeyA');
      const right = keys.has('ArrowRight') || keys.has('KeyD');
      if (left && !right) return -1;
      if (right && !left) return 1;
      return 0;
    },
    mouseX() {
      return mouseX;
    },
    mouseUsed() {
      return mouseX !== null;
    },
    // The actions pressed since the last poll, then cleared.
    poll() {
      const out = new Set(pressed);
      if (clicked) out.add(ACTION_CONFIRM);
      pressed = new Set();
      clicked = false;
      return out;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
    },
  };
}
