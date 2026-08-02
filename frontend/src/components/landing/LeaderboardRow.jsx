import React from 'react';

export default function LeaderboardRow({ rank, username, countryFlag, country, langIcon, language, score }) {
  return (
    <div className="grid grid-cols-5 gap-4 p-4 border-b border-[#39d353]/10 hover:bg-[#39d353]/5 transition-colors items-center text-sm">
      <div className="font-medium text-gray-300">{rank}</div>
      <div className="font-bold text-white">{username}</div>
      <div className="flex items-center gap-2 text-gray-400">
        <span className="text-lg">{countryFlag}</span> {country}
      </div>
      <div className="flex items-center gap-2 text-gray-400">
        <span className="text-lg">{langIcon}</span> {language}
      </div>
      <div className="font-bold text-[#39d353]">{score}</div>
    </div>
  );
}
