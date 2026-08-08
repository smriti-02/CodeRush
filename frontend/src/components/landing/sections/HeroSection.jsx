import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Play, Mouse } from 'lucide-react';
import HeroButton from '../HeroButton';

export const HeroSection = ({ onOpenAuth }) => {
  const navigate = useNavigate();

  const handleEnterArena = () => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    } else if (onOpenAuth) {
      onOpenAuth();
    } else {
      navigate('/login');
    }
  };

  return (
    <section id="hero" className="relative h-screen w-full flex flex-col overflow-hidden z-10">
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-50 relative pointer-events-auto">
        <a href="/" className="text-2xl font-display font-bold tracking-tighter text-[#39d353] hover:text-white transition-colors cursor-pointer">
          &lt;CODERUSH/&gt;
        </a>
      </nav>

      <main className="relative flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col justify-center pointer-events-none">
        <div className="max-w-3xl pointer-events-auto">
          <h2 className="text-[#39d353] text-sm font-bold font-mono tracking-widest uppercase mb-4 drop-shadow-md">
            01 HERO
          </h2>
          <h1 className="text-[110px] md:text-[130px] font-display leading-[0.85] font-black tracking-tight uppercase mb-4">
            <span className="block text-white drop-shadow-2xl">BATTLE</span>
            <span className="block text-white drop-shadow-2xl">YOUR WAY</span>
            <span className="block text-[#39d353] font-accent italic font-normal text-[100px] md:text-[120px] leading-[0.8] mt-4 tracking-normal capitalize shadow-green-glow">
              To Glory
            </span>
          </h1>
          
          <p className="mt-10 text-gray-400 text-xl max-w-md leading-relaxed">
            Challenge real developers in live coding battles. 
            Climb the global leaderboard. Become unstoppable.
          </p>

          <div className="mt-10 flex items-center gap-6 font-mono text-sm">
            <div onClick={handleEnterArena} className="inline-block cursor-pointer">
              <HeroButton variant="primary">
                <Swords size={18} />
                ENTER ARENA
              </HeroButton>
            </div>
            <HeroButton variant="secondary" className="bg-[#111111]/60 backdrop-blur-md border border-neutral-800">
              <Play size={18} className="fill-transparent group-hover:fill-[#39d353] transition-all" />
              WATCH DEMO
            </HeroButton>
          </div>
        </div>
      </main>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-500 text-[10px] font-mono font-bold tracking-widest uppercase animate-bounce pointer-events-none">
        <Mouse size={24} className="mb-2 text-gray-400" />
        SCROLL DOWN
      </div>
    </section>
  );
};
