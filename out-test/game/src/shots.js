// Screenshot scenes behind ?shot=start|play|action|end. Each plays the real
// rules forward from a fresh world for a fixed time, steered by an autopilot
// (aim for the next ring, swerve away from a close pillar), so the frame is
// what a short game really looks like and the same seed gives the same frame.
import { STEP } from './config.js';

// Autopilot: steer toward the next ring; dodge a pillar dead ahead (unless
// dodge is false, which is how the 'end' scene flies into trouble).
export function autopilot(state, plane, dodge = true) {
  const world = state.world;
  const ring = world.nextRing();
  let tx = plane.position.x;
  let ty = plane.position.y;
  if (ring) { tx = ring.x; ty = ring.y; }
  // Keep the aim inside the canyon walls at all times.
  const { centreX, halfWidth } = world;
  const cx = centreX(plane.position.z, state.world.state.seed);
  const hw = halfWidth(plane.position.z, state.world.state.seed);
  const lo = cx - (hw - 8); const hi = cx + (hw - 8);
  if (dodge) {
    for (const p of world.state.pillars) {
      if (p.archBeam) continue; // flying under an arch between its posts is safe
      const dz = plane.position.z - p.z; // positive when pillar is ahead (plane flies -z)
      if (dz > 0 && dz < 60 && Math.abs(plane.position.x - p.x) < p.r + 4 && plane.position.y < p.y + 3) {
        tx = p.x + (plane.position.x >= p.x ? p.r + 4.5 : -(p.r + 4.5));
      }
    }
  }
  tx = Math.max(lo, Math.min(hi, tx));
  const steer = Math.max(-1, Math.min(1, (tx - plane.position.x) / 4));
  const pitch = Math.max(-1, Math.min(1, (ty - plane.position.y) / 4));
  return { steer, pitch, boost: false, brake: false };
}

// Advance the game state (not the renderer) for `seconds` at fixed steps.
export function stageShot(name, game) {
  game.reset();
  const seconds = name === 'start' ? 4 : name === 'play' ? 14 : name === 'action' ? 12 : 240;
  let screen = 'title';
  for (let i = 0; i < seconds / STEP; i += 1) {
    let input;
    if (name === 'start') input = { steer: 0, pitch: 0, boost: false, brake: false };
    else if (name === 'end') input = autopilot(game.state, game.plane, false);
    else input = autopilot(game.state, game.plane, true);
    const ev = game.step(STEP, input);
    if (name === 'start') { screen = 'title'; continue; }
    if (ev === 'over') { screen = 'over'; break; }
    screen = 'play';
    // Action shot: stop the moment a ring is just ahead in frame, plane lined up.
    if (name === 'action') {
      const ring = game.state.world.nextRing();
      if (ring && game.plane.position.z - ring.z < 10 && game.plane.position.z - ring.z > 0) break;
    }
  }
  if (name === 'end' && screen !== 'over') screen = 'play';
  return { screen, best: game.state.best };
}
