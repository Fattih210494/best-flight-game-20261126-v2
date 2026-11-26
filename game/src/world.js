// Procedural desert canyon: winding centreline, stepped strata walls, river,
// glowing rings, rock pillars and arches. Chunked so the world streams ahead
// of the plane; generation is seeded, so the same seed gives the same canyon.
import * as THREE from 'three';
import { createRandom, range } from './random.js';
import { CHUNK_LENGTH, CHUNKS_AHEAD, CHUNKS_BEHIND, RING_RADIUS, RING_SPACING } from './config.js';

const STRATA = [
  { y: 0, color: new THREE.Color(0xc98f4e) }, // sand
  { y: 9, color: new THREE.Color(0xb45a20) }, // orange
  { y: 20, color: new THREE.Color(0x8e3418) }, // red
  { y: 34, color: new THREE.Color(0x5e2412) }, // dark red
  { y: 52, color: new THREE.Color(0x3f1c10) }, // rim
];
// Wall cross-section: lateral offset from river edge -> height.
const PROFILE = [[0, 0], [5, 7], [11, 16], [19, 30], [28, 46]];

function strataColor(y, out) {
  let c = STRATA[0].color;
  for (const s of STRATA) if (y >= s.y) c = s.color;
  out.copy(c);
  return out;
}

function midZOf(zStart, zEnd) { return (zStart + zEnd) / 2; }

// Centreline x at depth z (plane flies toward -z).
export function centreX(z, seed) {
  return 14 * Math.sin(z * 0.004 + seed * 0.7) + 8 * Math.sin(z * 0.011 + seed * 1.3);
}
export function halfWidth(z, seed) {
  return 24 + 6 * Math.sin(z * 0.006 + seed * 2.1) + 3 * Math.sin(z * 0.017 + seed);
}

function buildWallGeometry(rng, zStart, zEnd, side, seed) {
  const steps = Math.round((zEnd - zStart) / 10);
  const positions = [];
  const colors = [];
  const indices = [];
  const c = new THREE.Color();
  let row = 0;
  for (let i = 0; i <= steps; i += 1) {
    const z = zStart - i * 10;
    const cx = centreX(z, seed);
    const hw = halfWidth(z, seed);
    const wobble = range(rng, -1.5, 1.5);
    for (const [off, y] of PROFILE) {
      const x = cx + side * (hw + off) + wobble * (off / 28);
      positions.push(x, y, z);
      strataColor(y + range(rng, -1, 1), c);
      colors.push(c.r, c.g, c.b);
    }
    if (i > 0) {
      for (let p = 0; p < PROFILE.length - 1; p += 1) {
        const a = row - PROFILE.length + p; const b = a + 1;
        const d = row + p; const e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }
    row += PROFILE.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function createWorld(seed) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7fb2e0);
  scene.fog = new THREE.Fog(0xd8e8f2, 200, 650);

  const hemi = new THREE.HemisphereLight(0xffe9c4, 0x8a5a3a, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.8);
  sun.position.set(60, 120, 40);
  scene.add(sun);

  const wallMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });
  const riverMat = new THREE.MeshStandardMaterial({ color: 0x1e8a80, roughness: 0.15, metalness: 0.4 });
  const mesaMat = new THREE.MeshStandardMaterial({ color: 0x9c5a30, roughness: 1, flatShading: true });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x9c4a26, roughness: 0.95, flatShading: true });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x19e3ff, emissive: 0x0aa8c0, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.2 });
  const ringDoneMat = new THREE.MeshStandardMaterial({ color: 0x7dff9a, emissive: 0x2fae4e, emissiveIntensity: 1.0, roughness: 0.3, metalness: 0.2 });

  const chunks = new Map(); // chunkIndex -> { group, rings, pillars }
  const state = {
    seed, rings: [], pillars: [], nextRingZ: -60, ringsPassed: 0, distance: 0,
  };

  function buildChunk(index) {
    const zStart = -index * CHUNK_LENGTH + 40;
    const zEnd = zStart - CHUNK_LENGTH;
    const rng = createRandom((seed * 1000003 + index * 7919) >>> 0);
    const group = new THREE.Group();
    for (const side of [-1, 1]) {
      const mesh = new THREE.Mesh(buildWallGeometry(rng, zStart, zEnd, side, seed), wallMat);
      group.add(mesh);
    }
    // Canyon floor: sandy strips following the winding centreline, so the
    // ground fills the frame instead of void (the river runs on top of it).
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xc98f4e, roughness: 1, flatShading: true });
    const fsegLen = CHUNK_LENGTH / 8;
    for (let s = 0; s < 8; s += 1) {
      const sz = zStart - s * fsegLen - fsegLen / 2;
      const fw = (halfWidth(sz, seed) + 30) * 2;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fsegLen + 2, 1, 1), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(centreX(sz, seed), 0.1, sz);
      group.add(floor);
    }
    // River: short segments that follow the winding centreline.
    const segLen = CHUNK_LENGTH / 8;
    for (let s = 0; s < 8; s += 1) {
      const sz = zStart - s * segLen - segLen / 2;
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(10, segLen + 2, 1, 1), riverMat);
      seg.rotation.x = -Math.PI / 2;
      seg.position.set(centreX(sz, seed), 0.4, sz);
      group.add(seg);
    }
    const rings = []; const pillars = [];
    // Rings every RING_SPACING inside this chunk.
    for (let z = zStart - 20; z > zEnd; z -= RING_SPACING) {
      if (z > state.nextRingZ) continue;
      const cx = centreX(z, seed);
      const rx = cx + range(rng, -7, 7);
      const ry = range(rng, 12, 30);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, 0.55, 10, 28), ringMat.clone());
      ring.position.set(rx, ry, z);
      ring.rotation.y = 0; // faces the plane head-on
      group.add(ring);
      const rec = { mesh: ring, x: rx, y: ry, z, passed: false, mat: ringMat, doneMat: ringDoneMat };
      rings.push(rec);
      state.rings.push(rec);
    }
    // Pillars: 2-3 per chunk, clear of the centreline path.
    const nPillars = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < nPillars; i += 1) {
      const z = zStart - range(rng, 30, CHUNK_LENGTH - 10);
      const cx = centreX(z, seed);
      const side = rng() < 0.5 ? -1 : 1;
      const px = cx + side * range(rng, 12, 22);
      const h = range(rng, 14, 34);
      const r = range(rng, 1.8, 3.4);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 7), pillarMat);
      pillar.position.set(px, h / 2, z);
      group.add(pillar);
      pillars.push({ x: px, y: h, z, r, mesh: pillar, nearMissed: false });
      state.pillars.push({ x: px, y: h, z, r, mesh: pillar, nearMissed: false });
    }
    // (No distant mesas: they read as floating slabs from the chase camera.)
    // Boulders + shrubs along the river banks (below the flight floor, clear
    // of the flight path) for a richer canyon floor.
    const boulderGeo = new THREE.DodecahedronGeometry(1, 0);
    const boulderMat = new THREE.MeshStandardMaterial({ color: 0x8a6f52, roughness: 1, flatShading: true });
    const shrubGeo = new THREE.ConeGeometry(0.9, 1.6, 6);
    const shrubMat = new THREE.MeshStandardMaterial({ color: 0x3f6b2f, roughness: 1, flatShading: true });
    for (let b = 0; b < 10; b += 1) {
      const bz = zStart - range(rng, 10, CHUNK_LENGTH - 10);
      const side = rng() < 0.5 ? -1 : 1;
      const rock = new THREE.Mesh(boulderGeo, boulderMat);
      const rs = range(rng, 0.8, 2.2);
      rock.scale.setScalar(rs);
      rock.position.set(centreX(bz, seed) + side * range(rng, 10, 26), rs * 0.5, bz);
      rock.rotation.y = range(rng, 0, Math.PI);
      group.add(rock);
    }
    for (let s = 0; s < 14; s += 1) {
      const sz = zStart - range(rng, 10, CHUNK_LENGTH - 10);
      const side = rng() < 0.5 ? -1 : 1;
      const shrub = new THREE.Mesh(shrubGeo, shrubMat);
      shrub.scale.setScalar(range(rng, 0.8, 1.8));
      shrub.position.set(centreX(sz, seed) + side * range(rng, 10, 26), 0.8, sz);
      group.add(shrub);
    }
    // Clouds: soft white puffs high above the rim so the sky is not empty.
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let c = 0; c < 3; c += 1) {
      const cz = zStart - range(rng, 20, CHUNK_LENGTH - 20);
      const cloud = new THREE.Group();
      for (let p = 0; p < 3; p += 1) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 6, 11), 8, 6), cloudMat);
        puff.scale.y = 0.35;
        puff.position.set(range(rng, -8, 8), range(rng, -1, 1), range(rng, -4, 4));
        cloud.add(puff);
      }
      cloud.position.set(centreX(cz, seed) + (rng() < 0.5 ? -1 : 1) * range(rng, 60, 140), range(rng, 70, 110), cz);
      group.add(cloud);
    }
    // One arch per chunk: two posts + lintel, fly under it.
    const az = zStart - range(rng, 60, CHUNK_LENGTH - 40);
    const acx = centreX(az, seed);
    const span = range(rng, 16, 22);
    const beamY = range(rng, 22, 30);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, beamY, 7), pillarMat);
      post.position.set(acx + s * span / 2, beamY / 2, az);
      group.add(post);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(span + 4, 3, 3), pillarMat);
    lintel.position.set(acx, beamY + 1.5, az);
    group.add(lintel);
    pillars.push({ x: acx - span / 2, y: beamY, z: az, r: 2.1, mesh: null, nearMissed: false, arch: true });
    pillars.push({ x: acx + span / 2, y: beamY, z: az, r: 2.1, mesh: null, nearMissed: false, arch: true });
    state.pillars.push({ x: acx - span / 2, y: beamY, z: az, r: 2.1, mesh: null, nearMissed: false });
    state.pillars.push({ x: acx + span / 2, y: beamY, z: az, r: 2.1, mesh: null, nearMissed: false });
    state.pillars.push({ x: acx, y: beamY, z: az, r: span / 2, mesh: lintel, nearMissed: false, archBeam: true, beamY });

    scene.add(group);
    chunks.set(index, { group, rings, pillars });
  }

  function ensureChunks(planeZ) {
    const ahead = Math.ceil((-planeZ + 40) / CHUNK_LENGTH) + CHUNKS_AHEAD;
    const behind = Math.floor((-planeZ) / CHUNK_LENGTH) - CHUNKS_BEHIND;
    for (let i = behind; i <= ahead; i += 1) if (!chunks.has(i) && i >= 0) buildChunk(i);
    for (const [i, c] of chunks) {
      if (i < behind - 1 || i > ahead + 1) {
        scene.remove(c.group);
        chunks.delete(i);
      }
    }
    // Prune passed rings/pillars from state lists.
    state.rings = state.rings.filter((r) => r.z > planeZ - 120);
    state.pillars = state.pillars.filter((p) => p.z > planeZ - 120);
  }

  // Dust motes around the camera for speed feel.
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(240 * 3);
  const dustRng = createRandom(seed + 77);
  for (let i = 0; i < 240; i += 1) {
    dustPos[i * 3] = (dustRng() - 0.5) * 60;
    dustPos[i * 3 + 1] = dustRng() * 50;
    dustPos[i * 3 + 2] = -dustRng() * 120;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe9c4, size: 0.45, transparent: true, opacity: 0.3 }));
  scene.add(dust);

  return {
    scene, state, centreX, halfWidth,
    ensureChunks,
    nextRing() { return state.rings.find((r) => !r.passed) || null; },
    updateDust(plane) {
      const p = dust.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 1) {
        let z = p.getZ(i);
        if (z > plane.position.z + 15) p.setZ(i, z - 130);
        p.setX(i, plane.position.x + ((p.getX(i) - plane.position.x + 30) % 60) - 30);
      }
      p.needsUpdate = true;
    },
    // Collision + scoring against the plane. Returns events: 'ring' | 'near' | 'wall' | 'water' | 'pillar' | null.
    collide(plane, speed) {
      const z = plane.position.z;
      const cx = centreX(z, seed);
      const hw = halfWidth(z, seed);
      if (Math.abs(plane.position.x - cx) > hw - 3) return 'wall';
      if (plane.position.y < 1.2) return 'water';
      for (const p of state.pillars) {
        if (p.archBeam) {
          // Only the lintel band itself is solid; flying over the arch is safe.
          if (Math.abs(z - p.z) < 3 && Math.abs(plane.position.x - p.x) < p.r + 1
            && plane.position.y > p.beamY - 1 && plane.position.y < p.beamY + 4) return 'pillar';
          continue;
        }
        if (Math.abs(z - p.z) < 3.5) {
          const dx = plane.position.x - p.x;
          if (Math.abs(dx) < p.r + 3 && plane.position.y < p.y) return 'pillar';
          if (!p.nearMissed && Math.abs(dx) < p.r + 6 && plane.position.y < p.y + 4) {
            p.nearMissed = true;
            return 'near';
          }
        }
      }
      // A ring flown past without entering it is a miss, not a permanent target.
      for (const r of state.rings) {
        if (!r.passed && r.z > z + 8) { r.passed = true; }
      }
      for (const r of state.rings) {
        if (!r.passed && z <= r.z && z > r.z - speed * 0.1 - 2) {
          const d = Math.hypot(plane.position.x - r.x, plane.position.y - r.y);
          if (d < RING_RADIUS) {
            r.passed = true;
            r.mesh.material = r.doneMat;
            state.ringsPassed += 1;
            return 'ring';
          }
        }
      }
      return null;
    },
    resetRings() {
      for (const r of state.rings) { r.passed = false; r.mesh.material = r.mat; }
      state.ringsPassed = 0;
    },
  };
}
