import React from 'react';

export default function FeatureCard({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center text-center bg-[#111111] border border-[#39d353]/20 rounded-xl p-8 hover:border-[#39d353]/50 transition-colors group w-full">
      <div className="text-[#39d353] mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
