import React from 'react';
import LeaderboardRow from './LeaderboardRow';

export default function LeaderboardTable({ data }) {
  return (
    <div className="w-full bg-[#111111]/80 backdrop-blur-md border border-[#39d353]/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      <div className="grid grid-cols-5 gap-4 p-4 border-b border-[#39d353]/20 text-xs font-bold font-mono text-gray-400 uppercase tracking-wider bg-[#1a1a1a]/50">
        <div>Rank</div>
        <div>Username</div>
        <div>Country</div>
        <div>Preferred Language</div>
        <div>Score</div>
      </div>
      <div className="flex flex-col">
        {data.map((row, i) => (
          <LeaderboardRow key={i} {...row} />
        ))}
      </div>
    </div>
  );
}
