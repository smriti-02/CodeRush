import React, { useRef, useState } from 'react';
import { useScroll } from 'framer-motion';

import { useNavigate } from 'react-router-dom';
import { Home, Trophy, Cpu, Mail, User } from 'lucide-react';

import { SharedParticleSystem } from '../components/landing/3d/SharedParticleSystem';
import { HeroSection } from '../components/landing/sections/HeroSection';
import { LeaderboardSection } from '../components/landing/sections/LeaderboardSection';
import { AICoachSection } from '../components/landing/sections/AICoachSection';
import { ContactSection } from '../components/landing/sections/ContactSection';
import { AuthModal } from '../components/landing/AuthModal';
import Dock from '../components/ui/Dock';

export default function CodeRushHero() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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

  const dockItems = [
    { icon: <Home size={22} />, label: 'Home', onClick: () => window.location.hash = '#' },
    { icon: <Trophy size={22} />, label: 'Leaderboard', onClick: () => window.location.hash = '#leaderboard' },
    { icon: <Cpu size={22} />, label: 'AI Coach', onClick: () => window.location.hash = '#ai-coach' },
    { icon: <Mail size={22} />, label: 'Contact Us', onClick: () => window.location.hash = '#contact' },
    { icon: <User size={22} />, label: 'Profile', onClick: () => navigate('/profile') },
  ];

  return (
    <div className="relative bg-[#020503] text-white font-sans overflow-x-hidden">
      <SharedParticleSystem scrollYProgress={scrollYProgress} />
      
      {/* 3D Scrollable Content Layers */}
      <div ref={containerRef} className="relative z-10 w-full flex flex-col min-h-[300vh]">
        <HeroSection onOpenAuth={() => setIsAuthOpen(true)} />
        <LeaderboardSection leaderboardData={leaderboardData} />
        <AICoachSection />
      </div>

      {/* Footer Content */}
      <div className="relative z-20 w-full bg-[#020503]">
        <ContactSection />
      </div>

      {/* Auth Modal Overlay */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialMode="login" />

      {/* Mac OS Style Dock Navigation */}
      <Dock 
        items={dockItems}
        panelHeight={68}
        baseItemSize={50}
        magnification={70}
      />
    </div>
  );
}