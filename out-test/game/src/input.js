// Keyboard + mouse steering. Returns a fresh input state each frame.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';

export function createInput(canvas) {
  const keys = new Set();
  let dragX = 0; // -1..1 from mouse drag
  let dragging = false;
  let lastX = 0;
  const pressed = new Set();

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!e.repeat) pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }
  function onKeyUp(e) { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); }
  function onMouseDown(e) { dragging = true; lastX = e.clientX; }
  function onMouseMove(e) {
    if (!dragging) return;
    dragX = Math.max(-1, Math.min(1, dragX + (e.clientX - lastX) / 120));
    lastX = e.clientX;
  }
  function onMouseUp() { dragging = false; }
  function onBlur() { keys.clear(); dragging = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return {
    // -1..1 pitch (up positive), -1..1 roll/steer (right positive)
    read() {
      let pitch = 0; let steer = 0;
      if (keys.has('ArrowUp') || keys.has('w')) pitch += 1;
      if (keys.has('ArrowDown') || keys.has('s')) pitch -= 1;
      if (keys.has('ArrowLeft') || keys.has('a')) steer -= 1;
      if (keys.has('ArrowRight') || keys.has('d')) steer += 1;
      steer += dragX * 0.8;
      dragX *= 0.85; // drag fades so the plane recentres
      const boost = keys.has('Shift');
      const brake = keys.has(' ') || keys.has('Spacebar');
      const confirm = pressed.has('Enter') || pressed.has(' ');
      const pause = pressed.has('p') || pressed.has('Escape');
      pressed.clear();
      return { pitch: Math.max(-1, Math.min(1, pitch)), steer: Math.max(-1, Math.min(1, steer)), boost, brake, confirm, pause };
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}
