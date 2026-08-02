import * as THREE from 'three';

const MAX_PARTICLES = 20000;

const sdBox = (p, b, offset = {x:0, y:0, z:0}, r = 0) => {
  const x = Math.abs(p.x - offset.x) - b.x;
  const y = Math.abs(p.y - offset.y) - b.y;
  const z = Math.abs(p.z - offset.z) - b.z;
  
  // Exact distance for rounded box
  const px = Math.max(x, 0);
  const py = Math.max(y, 0);
  const pz = Math.max(z, 0);
  
  const len = Math.sqrt(px*px + py*py + pz*pz);
  const inside = Math.min(Math.max(x, Math.max(y, z)), 0);
  return len + inside - r;
};

const sdCylinder = (p, r, h, offset = {x:0, y:0, z:0}) => {
  const x = p.x - offset.x;
  const y = p.y - offset.y;
  const z = p.z - offset.z;
  const dXz = Math.sqrt(x*x + z*z) - r;
  const dY = Math.abs(y) - h;
  return Math.max(dXz, dY);
};

const sdSphere = (p, r, offset = {x:0, y:0, z:0}) => {
  const x = p.x - offset.x;
  const y = p.y - offset.y;
  const z = p.z - offset.z;
  return Math.sqrt(x*x + y*y + z*z) - r;
};

const sdTorus = (p, r1, r2, offset = {x:0, y:0, z:0}) => {
  const x = p.x - offset.x;
  const y = p.y - offset.y;
  const z = p.z - offset.z;
  const qx = Math.sqrt(x*x + y*y) - r1; 
  return Math.sqrt(qx*qx + z*z) - r2;
};

const opUnion = (d1, d2) => Math.min(d1, d2);
const opSub = (d1, d2) => Math.max(d1, -d2);
const opIntersect = (d1, d2) => Math.max(d1, d2);

// Math helpers
const rotate2D = (x, y, angle) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
};

// --- HIGH-FIDELITY GUN (SMG from Image 4) ---
const evalGunSDF = (p) => {
  let d = 9999;
  
  // 1. Main Receiver (Central body)
  const receiverBase = sdBox(p, {x: 6, y: 2.5, z: 1.5}, {x: 0, y: 2, z: 0}, 0.2);
  const receiverUpper = sdBox(p, {x: 7, y: 1.2, z: 1.8}, {x: -1, y: 4.5, z: 0}, 0.1);
  d = opUnion(receiverBase, receiverUpper);

  // Receiver Grooves / Details
  for(let i=0; i<6; i++) {
    const groove = sdCylinder({x: p.x, y: p.z, z: p.y}, 0.3, 3, {x: -3 + i*0.8, y: 0, z: 2}); // rotated cylinder
    d = opSub(d, groove);
  }

  // 2. Barrel Assembly
  const barrelBlock = sdBox(p, {x: 3.5, y: 1.8, z: 1.2}, {x: -8.5, y: 2, z: 0}, 0.1);
  d = opUnion(d, barrelBlock);
  
  const barrelPipe = sdCylinder(rotate2D(p.x, p.y, Math.PI/2), 0.6, 2, {x: 3.5, y: -13, z: 0});
  d = opUnion(d, barrelPipe);
  
  // Muzzle brake (ribbed)
  const muzzleBase = sdCylinder(rotate2D(p.x, p.y, Math.PI/2), 0.8, 1.5, {x: 3.5, y: -15.5, z: 0});
  let muzzle = muzzleBase;
  for(let i=0; i<3; i++) {
    const slit = sdBox(p, {x: 0.2, y: 1.5, z: 1.5}, {x: -14.5 - i*0.6, y: 3.5, z: 0});
    muzzle = opSub(muzzle, slit);
  }
  d = opUnion(d, muzzle);

  // 3. Top Sight (Holo sight)
  const rail = sdBox(p, {x: 6, y: 0.2, z: 0.8}, {x: -2, y: 5.8, z: 0});
  d = opUnion(d, rail);
  
  const sightBase = sdBox(p, {x: 1.5, y: 0.5, z: 1}, {x: 1, y: 6.5, z: 0});
  const sightArchOuter = sdBox(p, {x: 1, y: 1, z: 1}, {x: 1, y: 7.5, z: 0}, 0.3);
  const sightArchInner = sdBox(p, {x: 1.5, y: 0.8, z: 0.6}, {x: 1, y: 7.2, z: 0});
  const holo = opSub(opUnion(sightBase, sightArchOuter), sightArchInner);
  d = opUnion(d, holo);

  // 4. Stock (Back part)
  const stockPole = sdBox(p, {x: 3, y: 0.6, z: 0.6}, {x: 8, y: 3.5, z: 0});
  const stockPad = sdBox(p, {x: 1.5, y: 3.5, z: 1.2}, {x: 12, y: 2, z: 0}, 0.5);
  // Cutout in stock pad
  const padCutout = sdBox(p, {x: 2, y: 1.5, z: 2}, {x: 12, y: 1, z: 0});
  d = opUnion(d, stockPole);
  d = opUnion(d, opSub(stockPad, padCutout));

  // 5. Pistol Grip
  let gp = { ...p };
  let rg = rotate2D(gp.x - 3, gp.y + 1, -0.4);
  gp.x = rg.x; gp.y = rg.y;
  const grip = sdBox(gp, {x: 1.2, y: 3.5, z: 1.1}, {x: 0, y: 0, z: 0}, 0.3);
  d = opUnion(d, grip);

  // 6. Trigger & Guard
  const guard = sdBox(p, {x: 2, y: 1, z: 0.5}, {x: 1.5, y: -0.5, z: 0});
  const guardHole = sdBox(p, {x: 1.5, y: 0.8, z: 1}, {x: 1.5, y: -0.2, z: 0});
  d = opUnion(d, opSub(guard, guardHole));
  const trigger = sdBox(p, {x: 0.2, y: 0.6, z: 0.3}, {x: 1.5, y: 0.2, z: 0});
  d = opUnion(d, trigger);

  // 7. Underbarrel / Forward Grip
  const underBase = sdBox(p, {x: 3, y: 1.2, z: 1.3}, {x: -3, y: -0.2, z: 0}, 0.2);
  const flashlight = sdCylinder(rotate2D(p.x, p.y, Math.PI/2), 0.8, 1.5, {x: -0.5, y: -7, z: 0});
  d = opUnion(d, underBase);
  d = opUnion(d, flashlight);

  // Magazine (angled forward)
  let mp = { ...p };
  let rm = rotate2D(mp.x + 1, mp.y + 2, 0.2);
  mp.x = rm.x; mp.y = rm.y;
  const mag = sdBox(mp, {x: 1.5, y: 3, z: 1}, {x: 0, y: 0, z: 0}, 0.1);
  d = opUnion(d, mag);

  // Normalize scale and position
  // The gun is slightly large, we scale it down by returning d
  return d;
};

// --- HIGH-FIDELITY TROPHY ---
const evalTrophySDF = (p) => {
  let d = 9999;
  
  // 1. Base (Stepped pyramids)
  const base1 = sdBox(p, {x: 6.5, y: 1, z: 6.5}, {x: 0, y: -10, z: 0}, 0.2);
  const base2 = sdBox(p, {x: 5.5, y: 1, z: 5.5}, {x: 0, y: -8, z: 0}, 0.2);
  const base3 = sdBox(p, {x: 4.5, y: 1, z: 4.5}, {x: 0, y: -6, z: 0}, 0.2);
  d = opUnion(base1, opUnion(base2, base3));
  
  // 2. Stem (Elegant curve, simulated with cones or cylinders)
  const stem = sdCylinder(p, 1.5, 4, {x: 0, y: -1.5, z: 0});
  const stemRing = sdTorus(p, 2, 0.5, {x: 0, y: -3, z: 0});
  const stemRing2 = sdTorus(p, 2, 0.5, {x: 0, y: 0, z: 0});
  d = opUnion(d, opUnion(stem, opUnion(stemRing, stemRing2)));
  
  // 3. Cup Main Body (Wide hemisphere)
  const cupOuter = sdSphere(p, 7, {x: 0, y: 6, z: 0});
  const cupInner = sdSphere(p, 6, {x: 0, y: 7.5, z: 0});
  const topCutoff = sdBox(p, {x: 12, y: 10, z: 12}, {x: 0, y: 17, z: 0}); // Slice top off
  let cup = opSub(cupOuter, cupInner);
  cup = opSub(cup, topCutoff);
  d = opUnion(d, cup);
  
  // Cup Bottom Lip
  const lip = sdTorus(p, 6.7, 0.6, {x: 0, y: 7, z: 0});
  d = opUnion(d, lip);
  
  // 4. Handles (Elegant large Toruses, rotated)
  let hp = { ...p };
  hp.x = Math.abs(hp.x); // Mirror X
  
  // Rotate handles so they flare out
  let rHandle = rotate2D(hp.x - 7.5, hp.y - 5.5, -0.3);
  let hpx = rHandle.x; let hpy = rHandle.y;
  
  const handleOuter = sdTorus({x: hpx, y: hpy, z: hp.z}, 4.5, 0.8, {x: 0, y: 0, z: 0});
  d = opUnion(d, handleOuter);

  return d;
};

// --- HIGH-FIDELITY ROBOT (Cute TV Head) ---
const evalRobotSDF = (p) => {
  let d = 9999;
  
  // 1. Head (Rounded TV Box)
  const head = sdBox(p, {x: 6.5, y: 5, z: 5}, {x: 0, y: 7, z: 0}, 1.5);
  // Cutout for the screen face
  const screen = sdBox(p, {x: 5, y: 3.5, z: 2}, {x: 0, y: 7, z: 5}, 0.5);
  d = opSub(head, screen);

  // 2. Eyes (Cylinders protruding from the screen slightly)
  const leftEye = sdCylinder(rotate2D(p.x + 2.5, p.z - 4.5, Math.PI/2), 1.2, 0.5, {x: 0, y: 0, z: 7});
  const rightEye = sdCylinder(rotate2D(p.x - 2.5, p.z - 4.5, Math.PI/2), 1.2, 0.5, {x: 0, y: 0, z: 7});
  d = opUnion(d, opUnion(leftEye, rightEye));
  
  // 3. Antennas (Top and Ears)
  const topStem = sdCylinder(p, 0.3, 2, {x: 0, y: 13, z: 0});
  const topBall = sdSphere(p, 1, {x: 0, y: 15.5, z: 0});
  d = opUnion(d, opUnion(topStem, topBall));

  const leftEar = sdCylinder(rotate2D(p.x + 8.5, p.y - 7, Math.PI/2), 1, 1, {x: 0, y: 0, z: 0});
  const rightEar = sdCylinder(rotate2D(p.x - 8.5, p.y - 7, Math.PI/2), 1, 1, {x: 0, y: 0, z: 0});
  d = opUnion(d, opUnion(leftEar, rightEar));

  // 4. Body (Compact, rounded)
  const neck = sdCylinder(p, 1.2, 1, {x: 0, y: 1, z: 0});
  const body = sdBox(p, {x: 4.5, y: 4, z: 4}, {x: 0, y: -3, z: 0}, 1.2);
  d = opUnion(d, opUnion(neck, body));

  // Belly screen/detail
  const belly = sdBox(p, {x: 2.5, y: 1.5, z: 1}, {x: 0, y: -3, z: 4.5}, 0.2);
  d = opSub(d, belly);

  // 5. Floating Hands (Rounded pads)
  const lHand = sdBox(p, {x: 1.5, y: 1.5, z: 1.5}, {x: -8, y: -2, z: 3}, 0.8);
  const rHand = sdBox(p, {x: 1.5, y: 1.5, z: 1.5}, {x: 8, y: -2, z: 3}, 0.8);
  d = opUnion(d, opUnion(lHand, rHand));

  // 6. Base / Treads (Small floating feet)
  const lFoot = sdBox(p, {x: 1.8, y: 1, z: 3}, {x: -2.5, y: -9, z: 0.5}, 0.5);
  const rFoot = sdBox(p, {x: 1.8, y: 1, z: 3}, {x: 2.5, y: -9, z: 0.5}, 0.5);
  d = opUnion(d, opUnion(lFoot, rFoot));

  return d;
};


// Generator function
const generatePointsFromSDF = (sdfFunc, count, boundingBox, shapeName) => {
  const points = [];
  let attempts = 0;
  
  let seed = 98765;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  while (points.length < count && attempts < count * 200) {
    attempts++;
    const x = (random() - 0.5) * boundingBox.w;
    const y = (random() - 0.5) * boundingBox.h;
    const z = (random() - 0.5) * boundingBox.d;
    const p = {x, y, z};
    
    if (sdfFunc(p) <= 0) {
      let colorType = 'base';
      let isEye = false;

      if (shapeName === 'gun') {
        colorType = 'green';
        if (random() > 0.75) colorType = 'darkGreen';
        // Make the Holo sight glow cyan randomly
        if (p.y > 5.5 && p.x > 0 && p.x < 3) colorType = 'cyan';
      } else if (shapeName === 'trophy') {
        colorType = 'gold';
        if (random() > 0.8) colorType = 'lightGold';
      } else if (shapeName === 'robot') {
        colorType = 'green';
        if (random() > 0.8) colorType = 'darkGreen';
        
        // Eyes logic
        // We know eyes are roughly around y: 7, z: 4.5, x: +/- 2.5
        const leftEyeDist = Math.sqrt(Math.pow(p.x + 2.5, 2) + Math.pow(p.y - 7, 2) + Math.pow(p.z - 4.5, 2));
        const rightEyeDist = Math.sqrt(Math.pow(p.x - 2.5, 2) + Math.pow(p.y - 7, 2) + Math.pow(p.z - 4.5, 2));
        
        if (leftEyeDist < 1.8 || rightEyeDist < 1.8) {
          colorType = 'cyan';
          isEye = true;
        }

        // Antenna ball glow
        if (p.y > 14) colorType = 'cyan';
      }

      points.push({ pos: new THREE.Vector3(x, y, z), colorType, isEye });
    }
  }
  
  while(points.length < count) {
    points.push({ ...points[Math.floor(random() * points.length)] });
  }

  return points;
};

export const generateVoxelStates = () => {
  const gunBox = {w: 36, h: 25, d: 8};
  const trophyBox = {w: 30, h: 32, d: 20};
  const robotBox = {w: 30, h: 30, d: 20};

  const gunPoints = generatePointsFromSDF(evalGunSDF, MAX_PARTICLES, gunBox, 'gun');
  const trophyPoints = generatePointsFromSDF(evalTrophySDF, MAX_PARTICLES, trophyBox, 'trophy');
  const robotPoints = generatePointsFromSDF(evalRobotSDF, MAX_PARTICLES, robotBox, 'robot');

  const shuffle = (array) => {
    let m = array.length, t, i;
    while (m) {
      i = Math.floor(Math.random() * m--);
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  };

  shuffle(trophyPoints);
  shuffle(robotPoints);

  const states = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    states.push({
      id: i,
      state1: gunPoints[i],
      state2: trophyPoints[i],
      state3: robotPoints[i],
      scatter: new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      ),
      rot: new THREE.Vector3(
        Math.random() * Math.PI * 10,
        Math.random() * Math.PI * 10,
        Math.random() * Math.PI * 10
      )
    });
  }

  return states;
};

export const PALETTE = {
  green: new THREE.Color('#39d353'),
  darkGreen: new THREE.Color('#0e4429'),
  gold: new THREE.Color('#ffd700'),
  lightGold: new THREE.Color('#ffea00'),
  cyan: new THREE.Color('#00ffff')
};
