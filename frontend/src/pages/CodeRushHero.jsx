import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion, useScroll } from 'framer-motion';
import { Swords, Play, ChevronDown } from 'lucide-react';

// Generates the 3D voxel data for the futuristic gun
const generateGunVoxels = () => {
  const data = [];
  const colors = ['#0e4429', '#006d32', '#26a641', '#39d353'];

  // Dimensions
  const length = 32; // X
  const height = 22; // Y
  const depth = 4;   // Z

  for (let x = 0; x < length; x++) {
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        // Futuristic Hand Cannon Blueprint
        const isBarrel = x >= 0 && x <= 16 && y >= 13 && y <= 18;
        const isUnderbarrel = x >= 4 && x <= 16 && y >= 11 && y <= 12;
        const isBody = x > 16 && x <= 28 && y >= 11 && y <= 20;
        const isSight = x >= 18 && x <= 24 && y > 20 && y <= 21;
        const isGrip = x >= 20 && x <= 26 && y >= 0 && y < 11;
        const isTriggerGuard = x >= 15 && x < 20 && y >= 6 && y <= 10;
        const isTriggerHole = x >= 16 && x <= 19 && y >= 7 && y <= 9;
        const isTrigger = x === 19 && y === 8;

        let isSolid = isBarrel || isUnderbarrel || isBody || isSight || isGrip || isTriggerGuard;
        if (isTriggerHole && !isTrigger) isSolid = false;

        if (isSolid) {
          // Hollow out random pieces for the cyberpunk/github streak look
          if (Math.random() > 0.85) continue;

          // Center the gun coordinates around 0,0,0
          const posX = x - length / 2;
          const posY = y - height / 2;
          const posZ = z - depth / 2;

          // Scatter trajectories for the explosion effect
          const scatterX = (Math.random() - 0.5) * 40;
          const scatterY = (Math.random() - 0.5) * 40;
          const scatterZ = (Math.random() - 0.5) * 40;
          const rotX = (Math.random() - 0.5) * Math.PI * 4;
          const rotY = (Math.random() - 0.5) * Math.PI * 4;
          const rotZ = (Math.random() - 0.5) * Math.PI * 4;

          const color = colors[Math.floor(Math.random() * colors.length)];

          data.push({
            position: new THREE.Vector3(posX, posY, posZ),
            scatter: new THREE.Vector3(scatterX, scatterY, scatterZ),
            rotation: new THREE.Vector3(rotX, rotY, rotZ),
            color: new THREE.Color(color)
          });
        }
      }
    }
  }
  return data;
};

// The WebGL component that handles thousands of cubes with zero lag
const VoxelGunMesh = ({ scrollYProgress }) => {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const voxels = useMemo(() => generateGunVoxels(), []);

  // Apply colors on mount
  useEffect(() => {
    voxels.forEach((voxel, i) => {
      meshRef.current.setColorAt(i, voxel.color);
    });
    meshRef.current.instanceColor.needsUpdate = true;
  }, [voxels]);

  // Update positions on every frame based on scroll progress
  useFrame(() => {
    const progress = scrollYProgress.get(); // 0 (top) to 1 (bottom)
    
    voxels.forEach((voxel, i) => {
      // Interpolate position
      dummy.position.x = voxel.position.x + voxel.scatter.x * progress;
      dummy.position.y = voxel.position.y + voxel.scatter.y * progress;
      dummy.position.z = voxel.position.z + voxel.scatter.z * progress;
      
      // Interpolate rotation
      dummy.rotation.x = voxel.rotation.x * progress;
      dummy.rotation.y = voxel.rotation.y * progress;
      dummy.rotation.z = voxel.rotation.z * progress;

      // Scale down to 0 as they scatter to make them disappear smoothly
      const scale = 1 - (progress * 0.8);
      dummy.scale.set(scale, scale, scale);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, voxels.length]}>
      {/* 0.95 size leaves a tiny gap between cubes to emphasize the voxel look */}
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      {/* MeshStandardMaterial reacts to light, giving real 3D depth */}
      <meshStandardMaterial metalness={0.2} roughness={0.8} />
    </instancedMesh>
  );
};

export default function CodeRushHero() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  return (
    <div ref={containerRef} className="relative h-[250vh] bg-[#0a0a0a] text-white font-sans">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col">
        
        {/* Navbar */}
        <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-50 relative pointer-events-auto">
          <div className="text-2xl font-bold tracking-tighter text-[#39d353]">
            &lt;CODERUSH/&gt;
          </div>
          <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-white transition-colors">HOME</a>
            <a href="#" className="hover:text-white transition-colors">BATTLES</a>
            <a href="#" className="hover:text-white transition-colors">LEADERBOARD</a>
            <a href="#" className="hover:text-white transition-colors">AI COACH</a>
          </div>
          <div className="flex items-center space-x-3 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-full cursor-pointer hover:border-[#39d353] transition-colors">
            <div className="w-6 h-6 bg-[#39d353] rounded-full flex items-center justify-center text-xs font-bold text-black">
              H
            </div>
            <div className="flex flex-col text-xs">
              <span className="font-semibold text-white">Harsh Paryani</span>
              <span className="text-[#39d353] flex items-center gap-1">★ 1560</span>
            </div>
          </div>
        </nav>

        {/* 3D Canvas - Pushed to the background, taking up the whole screen to prevent layout jumping */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Canvas camera={{ position: [0, 0, 35], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 10]} intensity={1.5} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#39d353" />
            
            {/* The gun wrapper rotates the entire gun to face slightly forward/left */}
            <group rotation={[-0.1, -0.4, 0]} position={[8, -2, 0]}>
              <VoxelGunMesh scrollYProgress={scrollYProgress} />
            </group>
          </Canvas>
        </div>

        {/* Text Content */}
        <main className="relative flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col justify-center z-10 pointer-events-none">
          <div className="max-w-3xl">
            <h1 className="text-[140px] leading-[0.85] font-black tracking-tighter uppercase mb-4 pointer-events-auto">
              <span className="block text-white drop-shadow-2xl">BATTLE</span>
              <span className="block text-white drop-shadow-2xl">YOUR WAY</span>
              <span className="block text-[#39d353] font-cursive text-[120px] leading-[0.6] mt-6 tracking-normal capitalize font-light">
                To Glory
              </span>
            </h1>
            
            <p className="mt-10 text-gray-400 text-xl max-w-md leading-relaxed pointer-events-auto">
              Challenge real developers in live coding battles. 
              Climb the global leaderboard. Become unstoppable.
            </p>

            <div className="mt-10 flex items-center gap-6 pointer-events-auto">
              <button className="group flex items-center gap-3 bg-[#39d353] text-black px-8 py-4 rounded-md font-bold text-sm tracking-widest hover:bg-[#26a641] transition-all shadow-[0_0_25px_rgba(57,211,83,0.4)]">
                <Swords size={18} />
                ENTER ARENA
              </button>
              
              <button className="group flex items-center gap-3 border border-[#39d353]/30 text-[#39d353] bg-[#39d353]/5 px-8 py-4 rounded-md font-bold text-sm tracking-widest hover:bg-[#39d353]/15 transition-all">
                <Play size={18} className="fill-transparent group-hover:fill-[#39d353] transition-all" />
                WATCH DEMO
              </button>
            </div>
          </div>
        </main>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-600 text-xs font-bold tracking-widest uppercase animate-bounce z-10 pointer-events-none">
          <div className="h-16 w-[2px] bg-gradient-to-b from-transparent to-[#39d353] mb-3"></div>
          SCROLL DOWN
          <ChevronDown size={16} className="mt-1 text-[#39d353]" />
        </div>
        
      </div>
    </div>
  );
}