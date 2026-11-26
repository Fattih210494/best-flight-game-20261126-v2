// Original low-poly stunt plane built from Three.js primitives.
import * as THREE from 'three';

export function createAircraft() {
  const group = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: 0xf5e9c8, roughness: 0.6, metalness: 0.1, flatShading: true });
  const teal = new THREE.MeshStandardMaterial({ color: 0x0e7c7b, roughness: 0.5, metalness: 0.2, flatShading: true });
  const red = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.5, metalness: 0.2, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d2b36, roughness: 0.3, metalness: 0.4, flatShading: true });

  // Fuselage: tapered cylinder pointing -z (forward).
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.28, 3.4, 8), cream);
  body.rotation.x = Math.PI / 2; body.position.z = 0.1;
  group.add(body);
  // Nose cone.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 8), red);
  nose.rotation.x = -Math.PI / 2; nose.position.z = -2.2;
  group.add(nose);
  // Canopy.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark);
  canopy.scale.set(0.9, 0.75, 1.5); canopy.position.set(0, 0.42, -0.5);
  group.add(canopy);
  // Main wings.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 1.1), teal);
  wing.position.set(0, 0.05, -0.2);
  group.add(wing);
  // Wing tip caps.
  for (const s of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 1.1), red);
    tip.position.set(s * 2.2, 0.05, -0.2);
    group.add(tip);
  }
  // Tailplane + fin.
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.6), teal);
  tail.position.set(0, 0.12, 1.6);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.7), red);
  fin.position.set(0, 0.5, 1.55);
  group.add(fin);
  // Propeller (spins around z).
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 8), dark);
  hub.rotation.x = -Math.PI / 2; hub.position.z = -2.75;
  prop.add(hub);
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 0.06), dark);
    blade.rotation.z = a; blade.position.z = -2.7;
    prop.add(blade);
  }
  group.add(prop);
  // Navigation lights.
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  navL.position.set(-2.25, 0.05, -0.2); group.add(navL);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
  navR.position.set(2.25, 0.05, -0.2); group.add(navR);

  return {
    group,
    spinProp(dt, speedNorm) { prop.rotation.z += dt * (18 + speedNorm * 30); },
  };
}
