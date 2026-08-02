import React from 'react';

export default function LeaderboardRow({ rank, username, countryFlag, country, langIcon, language, score }) {
  return (
    <div className="grid grid-cols-5 gap-4 p-4 border-b border-[#39d353]/10 hover:bg-[#39d353]/5 transition-colors items-center text-sm">
      <div className="font-bold text-[#39d353] font-mono">{rank}</div>
      <div className="text-white font-medium truncate">{username}</div>
      <div className="flex items-center space-x-2 text-gray-300">
        <span className="text-lg">{countryFlag}</span>
        <span className="truncate">{country}</span>
      </div>
      <div className="flex items-center space-x-2 text-gray-300">
        <span className="text-lg">{langIcon}</span>
        <span>{language}</span>
      </div>
      <div className="text-[#39d353] font-bold font-mono">{score}</div>
    </div>
  );
}
