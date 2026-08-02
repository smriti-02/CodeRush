import * as THREE from 'three';

const MAX_PARTICLES = 20000;

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src}`));
  });
};

const extractParticlesFromImage = (img, targetWidth3D, depthScale, isRobot = false) => {
  const canvas = document.createElement('canvas');
  // Scale down the image slightly to avoid parsing millions of pixels if it's high-res
  // We only need MAX_PARTICLES anyway. A 200x200 canvas is 40,000 pixels.
  const maxSize = 250;
  let width = img.width;
  let height = img.height;

  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height).data;

  const points = [];
  const scale = targetWidth3D / width;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      const a = imageData[idx + 3];

      if (a > 20) { // Only non-transparent pixels
        // Convert coords to 3D space centered at origin
        const posX = (x - width / 2) * scale;
        const posY = -(y - height / 2) * scale;

        // Calculate brightness for depth
        const brightness = (r + g + b) / (255 * 3);
        // brighter pixels come forward, darker go back
        const posZ = (brightness - 0.5) * depthScale;

        points.push({
          pos: new THREE.Vector3(posX, posY, posZ),
          color: new THREE.Color(`rgb(${r}, ${g}, ${b})`)
        });
      }
    }
  }

  // We need exactly MAX_PARTICLES points.
  // If we have fewer, duplicate randomly. If more, randomly sample.
  const finalPoints = [];
  if (points.length === 0) {
    // Fallback if image is empty or failed to parse
    for (let i = 0; i < MAX_PARTICLES; i++) finalPoints.push({ pos: new THREE.Vector3(), color: new THREE.Color('#39d353') });
    return finalPoints;
  }

  // Shuffle array to ensure if we slice, we get an even distribution
  points.sort(() => Math.random() - 0.5);

  if (points.length >= MAX_PARTICLES) {
    return points.slice(0, MAX_PARTICLES);
  } else {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      // Loop over existing points, duplicating them
      const p = points[i % points.length];
      finalPoints.push({
        pos: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z + (Math.random() - 0.5) * 0.2), // slight jitter to duplicated points
        color: p.color
      });
    }
    return finalPoints;
  }
};

export const generateImageVoxelStates = async () => {
  try {
    const [gunImg, trophyImg, robotImg] = await Promise.all([
      loadImage('/gun.png'),
      loadImage('/trophy.png'),
      loadImage('/robot.png')
    ]);

    const gunPoints = extractParticlesFromImage(gunImg, 30, 4, false);
    const trophyPoints = extractParticlesFromImage(trophyImg, 12, 6, false);
    const robotPoints = extractParticlesFromImage(robotImg, 18, 4, true);

    // To make the transition chaotic, we shuffle the destination points independently
    // This ensures particles fly across the screen instead of sliding uniformly
    const shuffle = (array) => array.sort(() => Math.random() - 0.5);

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
          (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * 120
        ),
        rot: new THREE.Vector3(
          Math.random() * Math.PI * 10,
          Math.random() * Math.PI * 10,
          Math.random() * Math.PI * 10
        )
      });
    }
    return states;
  } catch (error) {
    console.error("Failed to load images for voxel system. Ensure gun.png, trophy.png, and robot.png exist in public folder.", error);
    return [];
  }
};
