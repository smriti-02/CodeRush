import React from 'react';

export default function MetricCard({ icon, value, label }) {
  return (
    <div className="flex items-center justify-center gap-4 bg-[#111111] border border-[#39d353]/20 rounded-xl p-6 hover:border-[#39d353]/40 transition-colors w-full">
      <div className="text-[#39d353] flex items-center justify-center">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-white leading-tight">{value}</span>
        <span className="text-xs text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
}
