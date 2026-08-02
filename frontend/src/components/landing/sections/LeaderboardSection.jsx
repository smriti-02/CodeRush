import React from 'react';
import { Mouse } from 'lucide-react';
import LeaderboardTable from '../LeaderboardTable';

export const LeaderboardSection = ({ leaderboardData }) => {
  return (
    <section id="leaderboard" className="w-full max-w-7xl mx-auto px-6 py-16 relative z-10 min-h-[100vh] flex flex-col justify-end pointer-events-none">
      
      <div className="pointer-events-auto mt-auto mb-24 relative grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Side: Text & Leaderboard */}
        <div className="flex flex-col h-full max-w-xl">
          <div className="mb-10">
            <h2 className="text-[#39d353] text-sm font-bold font-mono tracking-widest uppercase mb-4 drop-shadow-md">
              02 BATTLES
            </h2>
            <h3 className="text-[70px] font-display font-black tracking-tighter uppercase text-white mb-2 leading-[0.9] drop-shadow-lg">
              GLOBAL LIVE<br/>
              <span className="text-[#39d353] font-accent italic font-normal text-[85px] leading-[0.8] tracking-normal capitalize">Leaderboard</span>
            </h3>
            <p className="text-gray-400 text-lg mt-6 max-w-md leading-relaxed">
              Real-time standings of top developers worldwide.
              Prove your skills and secure your rank.
            </p>
          </div>
          
          <LeaderboardTable data={leaderboardData} />
        </div>

        {/* Right Side: Empty space for 3D Trophy */}
        <div className="relative w-full h-full min-h-[500px] flex items-center justify-center pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#ffd700]/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="flex flex-col items-center justify-center mt-12 text-gray-500 text-[10px] font-bold tracking-widest uppercase pointer-events-none relative z-20">
        <Mouse size={24} className="mb-2 text-gray-400" />
        SCROLL DOWN
      </div>
      
    </section>
  );
};
