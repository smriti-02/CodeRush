import React from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ParticleMorphEngine } from './ParticleMorphEngine';

export const SharedParticleSystem = ({ scrollYProgress }) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#020503]">
      <Canvas camera={{ position: [0, 0, 35], fov: 45 }}>
        {/* Cinematic ambient lighting */}
        <ambientLight intensity={1.5} color="#ffffff" />
        <directionalLight position={[10, 20, 10]} intensity={3.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={2.5} color="#39d353" />
        <pointLight position={[10, -10, 5]} intensity={2.5} color="#ffd700" />
        
        <group rotation={[-0.1, -0.4, 0]} position={[8, -2, 0]}>
          <ParticleMorphEngine scrollYProgress={scrollYProgress} />
        </group>

        {/* Premium Bloom Effect for glowing cubes */}
        <EffectComposer>
          <Bloom 
            luminanceThreshold={0.4} 
            luminanceSmoothing={0.9} 
            intensity={1.2} 
            mipmapBlur 
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
