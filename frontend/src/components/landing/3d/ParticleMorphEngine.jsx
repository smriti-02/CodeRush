import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { generateImageVoxelStates } from '../../../utils/imageToParticles';
import { useScrollSceneManager } from '../hooks/useScrollSceneManager';

export const ParticleMorphEngine = ({ scrollYProgress }) => {
  const meshRef = useRef();
  const [voxels, setVoxels] = useState([]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const { getFactor } = useScrollSceneManager(scrollYProgress);

  // Load image data asynchronously
  useEffect(() => {
    let mounted = true;
    const loadVoxels = async () => {
      const states = await generateImageVoxelStates();
      if (mounted && states.length > 0) {
        setVoxels(states);
      }
    };
    loadVoxels();
    return () => { mounted = false; };
  }, []);

  // Initialize colors when voxels load
  useEffect(() => {
    if (!meshRef.current || voxels.length === 0) return;
    voxels.forEach((voxel, i) => {
      meshRef.current.setColorAt(i, voxel.state1.color);
    });
    meshRef.current.instanceColor.needsUpdate = true;
  }, [voxels]);

  useFrame(({ clock }) => {
    if (!meshRef.current || voxels.length === 0) return;

    const time = clock.getElapsedTime();
    const overallFactor = getFactor();

    voxels.forEach((voxel, i) => {
      let currentPos, targetPos, color1, color2, scatterVec;
      let localFactor = 0;

      const s1 = voxel.state1;
      const s2 = voxel.state2;
      const s3 = voxel.state3;

      // Apply offset for trophy to move it further to the right
      const trophyOffset = new THREE.Vector3(4, 0, 0);
      const s2PosOffset = s2.pos.clone().add(trophyOffset);

      if (overallFactor <= 1) {
        localFactor = overallFactor;
        currentPos = s1.pos;
        targetPos = s2PosOffset;
        color1 = s1.color;
        color2 = s2.color;
        scatterVec = voxel.scatter;
      } else {
        localFactor = overallFactor - 1;
        currentPos = s2PosOffset;
        const robotOffset = new THREE.Vector3(0, 4, 0);
        targetPos = s3.pos.clone().add(robotOffset);
        color1 = s2.color;
        color2 = s3.color;
        scatterVec = voxel.scatter;
      }

      const scatterIntensity = Math.sin(localFactor * Math.PI) * Math.pow(Math.sin(localFactor * Math.PI), 2);

      const smoothFactor = localFactor < 0.5
        ? 4 * localFactor * localFactor * localFactor
        : 1 - Math.pow(-2 * localFactor + 2, 3) / 2;

      dummy.position.lerpVectors(currentPos, targetPos, smoothFactor);
      dummy.position.addScaledVector(scatterVec, scatterIntensity * 3);

      dummy.rotation.set(
        voxel.rot.x * scatterIntensity + time * 0.5 * scatterIntensity,
        voxel.rot.y * scatterIntensity + time * 0.5 * scatterIntensity,
        voxel.rot.z * scatterIntensity + time * 0.5 * scatterIntensity
      );

      // Base scale slightly smaller since we have 20,000 pixels
      const baseScale = 0.18;
      const finalScale = baseScale * (1 - scatterIntensity * 0.5);
      dummy.scale.set(finalScale, finalScale, finalScale);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      tempColor.copy(color1).lerp(color2, smoothFactor);

      if (scatterIntensity > 0) {
        tempColor.lerp(new THREE.Color('#ffffff'), scatterIntensity * 0.5);
      }

      meshRef.current.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor.needsUpdate = true;
  });

  if (voxels.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, voxels.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial
        roughness={0.2}
        metalness={0.8}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
      />
    </instancedMesh>
  );
};
