import React, { useRef } from 'react';
import { useScroll } from 'framer-motion';

import { SharedParticleSystem } from '../components/landing/3d/SharedParticleSystem';
import { HeroSection } from '../components/landing/sections/HeroSection';
import { LeaderboardSection } from '../components/landing/sections/LeaderboardSection';
import { AICoachSection } from '../components/landing/sections/AICoachSection';

export default function CodeRushHero() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const leaderboardData = [
    { rank: '1st', username: 'swift_coder', countryFlag: '🇩🇪', country: 'Germany', langIcon: '🐍', language: 'Python', score: '14850' },
    { rank: '2nd', username: 'java_ninja', countryFlag: '🇯🇵', country: 'Japan', langIcon: '☕', language: 'Java', score: '14210' },
    { rank: '3rd', username: 'sherm_cervo', countryFlag: '🇮🇹', country: 'Italy', langIcon: '☕', language: 'Java', score: '14710' },
    { rank: '4th', username: 'doud_coder', countryFlag: '🇬🇧', country: 'UK', langIcon: '🐍', language: 'Python', score: '10000' },
    { rank: '5th', username: 'delato.go', countryFlag: '🇳🇱', country: 'Holland', langIcon: '🐍', language: 'Python', score: '9630' },
    { rank: '7th', username: 'cherrox_coder', countryFlag: '🇩🇪', country: 'Germany', langIcon: '🐍', language: 'Python', score: '8210' },
    { rank: '8th', username: 'noarohr_nmaoni', countryFlag: '🇮🇹', country: 'Italy', langIcon: '☕', language: 'Java', score: '8010' },
    { rank: '9th', username: 'mraah_eepata', countryFlag: '🇯🇵', country: 'Japan', langIcon: '☕', language: 'Java', score: '7270' },
    { rank: '10th', username: 'edif_coder', countryFlag: '🇯🇵', country: 'Japan', langIcon: '☕', language: 'Java', score: '7640' },
  ];

  return (
    <div ref={containerRef} className="relative bg-[#020503] text-white font-sans min-h-[300vh] overflow-x-hidden">
      <SharedParticleSystem scrollYProgress={scrollYProgress} />
      
      {/* Scrollable Content Layers */}
      <div className="relative z-10 w-full flex flex-col">
        <HeroSection />
        <LeaderboardSection leaderboardData={leaderboardData} />
        <AICoachSection />
      </div>
    </div>
  );
}