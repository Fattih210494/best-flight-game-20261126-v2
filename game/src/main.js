// Canyon Chase — boot, loop, flight model, HUD, screens.
// ?seed=N fixes the canyon. ?shot=start|play|action|end stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import * as THREE from 'three';
import { BEST_KEY, BASE_SPEED, MAX_SPEED, SPEED_PER_RING, LIVES, RING_SCORE, NEAR_MISS_SCORE, PLANE_MIN_Y, PLANE_MAX_Y, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, centreX } from './world.js';
import { createAircraft } from './aircraft.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
void createRandom(seed); // seed drives world gen; kept for the deterministic shot path

const canvas = document.getElementById('game');
const hud = {
  speed: document.getElementById('hud-speed-v'),
  alt: document.getElementById('hud-alt-v'),
  heading: document.getElementById('hud-heading-v'),
  eng: document.getElementById('hud-eng-v'),
  flaps: document.getElementById('hud-flaps-v'),
  spoilers: document.getElementById('hud-spoilers-v'),
  dist: document.getElementById('hud-dist-v'),
  score: document.getElementById('hud-score-v'),
  rings: document.getElementById('hud-rings-v'),
  streak: document.getElementById('hud-streak-v'),
  lives: document.getElementById('hud-lives'),
  msg: document.getElementById('hud-msg'),
};
const minimap = document.getElementById('hud-minimap');
const mm = minimap.getContext('2d');
const titleEl = document.getElementById('screen-title');
const overEl = document.getElementById('screen-over');
const overScore = document.getElementById('over-score');
const overBest = document.getElementById('over-best');
const flashEl = document.getElementById('flash');
const pauseEl = document.getElementById('screen-pause');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 700);

const world = createWorld(seed);
const aircraft = createAircraft();
world.scene.add(aircraft.group);
const audio = createAudio();

const state = {
  world, score: 0, best: 0, lives: LIVES, rings: 0, streak: 0,
  distance: 0, speed: BASE_SPEED, vx: 0, vy: 0, invuln: 0, shake: 0,
  lastRing: { x: centreX(0, seed), y: 18, z: 0 }, lastInput: { brake: false, boost: false },
};
const plane = aircraft.group;

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { window.localStorage.setItem(BEST_KEY, String(v)); } catch { /* private mode */ }
}
state.best = readBest();

function reset() {
  state.score = 0; state.lives = LIVES; state.rings = 0; state.streak = 0;
  state.distance = 0; state.speed = BASE_SPEED; state.vx = 0; state.vy = 0;
  state.invuln = 0; state.shake = 0;
  state.lastRing = { x: centreX(0, seed), y: 18, z: 0 };
  plane.position.set(centreX(0, seed), 18, 0);
  plane.rotation.set(0, 0, 0);
  world.resetRings();
  world.ensureChunks(0);
}

function crash(kind) {
  state.lives -= 1;
  state.streak = 0;
  state.shake = 0.5;
  audio.crash();
  flashEl.style.opacity = '0.55';
  setTimeout(() => { flashEl.style.opacity = '0'; }, 120);
  if (state.lives <= 0) {
    if (state.score > state.best) { state.best = state.score; saveBest(state.best); }
    return 'over';
  }
  // Respawn just behind the last ring, briefly invulnerable.
  plane.position.set(state.lastRing.x, state.lastRing.y, state.lastRing.z + 25);
  state.vx = 0; state.vy = 0; state.speed = BASE_SPEED;
  state.invuln = 2.5;
  return null;
}

function step(dt, input) {
  state.lastInput = input;
  const target = Math.max(BASE_SPEED - 6, Math.min(MAX_SPEED,
    BASE_SPEED + state.rings * SPEED_PER_RING + (input.boost ? 7 : 0) - (input.brake ? 9 : 0)));
  state.speed += (target - state.speed) * Math.min(1, dt * 1.5);
  state.vx += ((input.steer * 22) - state.vx) * Math.min(1, dt * 4);
  state.vy += ((input.pitch * 15) - state.vy) * Math.min(1, dt * 4);
  plane.position.x += state.vx * dt;
  plane.position.y = Math.max(PLANE_MIN_Y, Math.min(PLANE_MAX_Y, plane.position.y + state.vy * dt));
  plane.position.z -= state.speed * dt;
  state.distance += state.speed * dt;
  state.score += state.speed * dt * 0.1;
  plane.rotation.z = THREE.MathUtils.lerp(plane.rotation.z, -input.steer * 0.55, dt * 6);
  plane.rotation.x = THREE.MathUtils.lerp(plane.rotation.x, -input.pitch * 0.22, dt * 6);
  plane.rotation.y = THREE.MathUtils.lerp(plane.rotation.y, -state.vx * 0.012, dt * 6);
  aircraft.spinProp(dt, state.speed / MAX_SPEED);
  if (state.invuln > 0) state.invuln -= dt;
  if (state.shake > 0) state.shake -= dt;
  world.ensureChunks(plane.position.z);
  world.updateDust(plane);
  audio.setEngine(state.speed / MAX_SPEED);
  if (state.invuln <= 0) {
    const ev = world.collide(plane, state.speed);
    if (ev === 'ring') {
      state.rings += 1; state.streak += 1;
      state.score += RING_SCORE;
      state.lastRing = { x: plane.position.x, y: plane.position.y, z: plane.position.z };
      audio.ring();
      hud.msg.textContent = `RING +${RING_SCORE}`;
      setTimeout(() => { hud.msg.textContent = ''; }, 900);
    } else if (ev === 'near') {
      state.score += NEAR_MISS_SCORE;
      audio.nearMiss();
      hud.msg.textContent = `NEAR MISS +${NEAR_MISS_SCORE}`;
      setTimeout(() => { hud.msg.textContent = ''; }, 900);
    } else if (ev === 'wall' || ev === 'water' || ev === 'pillar') {
      return crash(ev);
    }
  }
  return null;
}

const game = { state, plane, reset, step };

function drawMinimap() {
  const W = 150, H = 90;
  mm.clearRect(0, 0, W, H);
  const zNear = plane.position.z + 120, zFar = plane.position.z - 260;
  const toX = (x) => 75 + (x - plane.position.x) * 1.1;
  const toY = (z) => ((zNear - z) / (zNear - zFar)) * H;
  // Canyon path (centreline) ahead.
  mm.strokeStyle = '#ffd98a'; mm.lineWidth = 2; mm.beginPath();
  for (let z = zNear; z >= zFar; z -= 10) {
    const x = toX(centreX(z, seed)), y = toY(z);
    if (z === zNear) mm.moveTo(x, y); else mm.lineTo(x, y);
  }
  mm.stroke();
  // Next ring marker.
  const nr = world.nextRing();
  if (nr) {
    mm.fillStyle = '#19e3ff';
    mm.beginPath(); mm.arc(toX(nr.x), toY(nr.z), 4, 0, Math.PI * 2); mm.fill();
  }
  // Plane marker.
  mm.fillStyle = '#ffffff';
  mm.beginPath(); mm.arc(75, toY(plane.position.z), 3.5, 0, Math.PI * 2); mm.fill();
  mm.fillStyle = '#ffd98a'; mm.font = '9px system-ui, sans-serif';
  mm.fillText('MAP', 4, 10);
}

function updateHud() {
  const knots = Math.round(state.speed * 3.8);
  const altFt = Math.round(Math.max(0, plane.position.y - 0.4) * 10);
  const heading = Math.round((Math.atan2(state.vx, state.speed) * 180 / Math.PI + 360) % 360);
  hud.speed.textContent = String(knots);
  hud.alt.textContent = String(altFt);
  hud.heading.textContent = String(heading).padStart(3, '0');
  hud.eng.textContent = String(Math.round(55 + (state.speed / MAX_SPEED) * 45));
  hud.flaps.textContent = state.lastInput.brake ? '2' : '0';
  hud.spoilers.textContent = state.lastInput.brake ? '2' : '0';
  drawMinimap();
  hud.dist.textContent = Math.round(state.distance * 3).toLocaleString('en-US');
  hud.score.textContent = Math.round(state.score).toLocaleString('en-US');
  hud.rings.textContent = String(state.rings);
  hud.streak.textContent = state.streak > 1 ? `x${state.streak}` : '';
  hud.lives.textContent = '✈'.repeat(Math.max(0, state.lives)) + '·'.repeat(Math.max(0, LIVES - state.lives));
  plane.visible = !(state.invuln > 0 && Math.floor(state.invuln * 8) % 2 === 0);
}

function render(screen) {
  const px = plane.position.x; const py = plane.position.y; const pz = plane.position.z;
  const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 2 : 0;
  const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 2 : 0;
  if (screen === 'title') {
    camera.position.set(px * 0.6 + shakeX, py + 6 + shakeY, pz + 20);
    camera.lookAt(px, py - 1, pz - 30);
  } else {
    camera.position.set(px * 0.72 + shakeX, py + 3.5 + shakeY, pz + 11);
    camera.lookAt(px, py - 0.5, pz - 30);
  }
  updateHud();
  renderer.render(world.scene, camera);
}

function showScreen(screen) {
  titleEl.classList.toggle('hidden', screen !== 'title');
  overEl.classList.toggle('hidden', screen !== 'over');
  pauseEl.classList.toggle('hidden', screen !== 'pause');
  document.getElementById('hud').classList.toggle('hidden', screen === 'title' || screen === 'over');
}

function runShot(name) {
  const scene = stageShot(name, game);
  if (scene.screen === 'over') {
    overScore.textContent = Math.round(state.score).toLocaleString('en-US');
    overBest.textContent = Math.round(Math.max(state.best, state.score)).toLocaleString('en-US');
  }
  showScreen(scene.screen);
  let painted = 0;
  function paint() {
    render(scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = 'title';
  let accumulator = 0;
  let last = performance.now();
  reset();
  showScreen('title');

  function start() {
    audio.unlock(); audio.click();
    reset();
    screen = 'play';
    showScreen('play');
  }
  document.getElementById('btn-start').addEventListener('click', start);
  document.getElementById('btn-restart').addEventListener('click', start);
  document.getElementById('btn-mute').addEventListener('click', (e) => {
    const m = audio.toggleMute();
    e.currentTarget.textContent = m ? '🔇' : '🔊';
  });
  canvas.addEventListener('click', () => { if (screen === 'title') start(); });

  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const inp = input.read();
    if (inp.pause && (screen === 'play' || screen === 'pause')) {
      screen = screen === 'play' ? 'pause' : 'play';
      showScreen(screen);
    }
    if (inp.confirm && screen === 'title') start();
    if (inp.confirm && screen === 'over') start();
    if (screen === 'play') {
      accumulator += dt;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        if (step(STEP, inp) === 'over') {
          screen = 'over';
          overScore.textContent = Math.round(state.score).toLocaleString('en-US');
          overBest.textContent = Math.round(state.best).toLocaleString('en-US');
          showScreen('over');
          break;
        }
      }
    }
    render(screen);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

reset();
if (shot) runShot(shot);
else runGame();
