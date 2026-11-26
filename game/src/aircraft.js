// Original twin-engine airliner built from Three.js primitives — smooth
// lathe fuselage, swept tapered wings (extruded planform), 4 under-wing
// engines. Modelled on the reference: big wide-body jet seen from behind.
import * as THREE from 'three';

export function createAircraft() {
  const group = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: 0xf5e9c8, roughness: 0.55, metalness: 0.15, flatShading: true });
  const teal = new THREE.MeshStandardMaterial({ color: 0x0e7c7b, roughness: 0.5, metalness: 0.25, flatShading: true, side: THREE.DoubleSide });
  const red = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.5, metalness: 0.25, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d2b36, roughness: 0.3, metalness: 0.5, flatShading: true });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa5ad, roughness: 0.35, metalness: 0.7, flatShading: true });

  // Fuselage: smooth airliner profile via lathe (nose -z, tail +z).
  const profile = [
    [0.02, -4.6], [0.28, -4.3], [0.52, -3.8], [0.66, -3.0], [0.70, -2.0],
    [0.70, 0.0], [0.68, 1.5], [0.55, 2.5], [0.35, 3.2], [0.10, 3.8], [0.02, 4.0],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 18), cream);
  body.rotation.x = Math.PI / 2; // lathe +y -> +z, so nose (-y) points -z (forward)
  group.add(body);
  // Cockpit windows, flush on the nose.
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark);
  cockpit.scale.set(1, 0.4, 1.1); cockpit.position.set(0, 0.45, -3.55);
  group.add(cockpit);
  // Red cheatline stripe along each side.
  for (const s of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 5.0), red);
    stripe.position.set(s * 0.71, 0.05, 0.0);
    group.add(stripe);
  }

  // Wing planform (right wing): swept back, tapered chord.
  function wingGeometry(rootLE, tipLE, tipTE, rootTE, tipX, depth) {
    const shape = new THREE.Shape();
    shape.moveTo(0.6, rootLE);
    shape.lineTo(tipX, tipLE);
    shape.lineTo(tipX, tipTE);
    shape.lineTo(0.6, rootTE);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); // planform flat, leading edge forward (-z)
    return g;
  }
  const wingGeo = wingGeometry(1.0, -0.3, -1.1, -1.4, 3.5, 0.14);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, teal);
    wing.scale.x = s;
    wing.position.set(0, -0.12, -0.5);
    group.add(wing);
  }
  // Tailplane: same swept tapered planform, smaller.
  const tailGeo = wingGeometry(0.6, -0.1, -0.7, -0.9, 1.6, 0.12);
  for (const s of [-1, 1]) {
    const tail = new THREE.Mesh(tailGeo, teal);
    tail.scale.x = s;
    tail.position.set(0, 0.05, 3.1);
    group.add(tail);
  }
  // Vertical fin: swept back, red.
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(1.1, 0);
  finShape.lineTo(0.75, 1.2);
  finShape.lineTo(0.15, 1.2);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.1, bevelEnabled: false });
  const fin = new THREE.Mesh(finGeo, red);
  fin.position.set(-0.05, 0.35, 2.9);
  group.add(fin);

  // Four under-wing engines with spinning fan discs.
  const fans = [];
  for (const x of [-2.7, -1.5, 1.5, 2.7]) {
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 10), steel);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(x, -0.5, -0.8);
    group.add(nacelle);
    const intake = new THREE.Mesh(new THREE.CircleGeometry(0.25, 10), dark);
    intake.position.set(x, -0.5, -1.56);
    intake.rotation.y = Math.PI; // face forward (-z)
    group.add(intake);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.19, 8),
      new THREE.MeshBasicMaterial({ color: 0xcfd8dc }));
    fan.position.set(x, -0.5, -1.57);
    fan.rotation.y = Math.PI;
    group.add(fan);
    fans.push(fan);
    const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 10), dark);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(x, -0.5, 0.05);
    group.add(exhaust);
  }
  // Navigation lights at the wingtips.
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  navL.position.set(-3.5, -0.05, -0.5); group.add(navL);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
  navR.position.set(3.5, -0.05, -0.5); group.add(navR);

  group.scale.setScalar(1.5);
  return {
    group,
    spinProp(dt, speedNorm) { for (const f of fans) f.rotation.z += dt * (20 + speedNorm * 40); },
  };
}
