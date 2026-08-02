import React from 'react';

export default function HeroButton({ children, variant = 'primary', className = '', ...props }) {
  const baseClasses = "group flex items-center gap-3 px-8 py-4 rounded-md font-bold text-sm tracking-widest transition-all";
  const variants = {
    primary: "bg-[#39d353] text-black hover:bg-[#26a641] shadow-[0_0_25px_rgba(57,211,83,0.4)]",
    secondary: "border border-[#39d353]/30 text-[#39d353] bg-[#39d353]/5 hover:bg-[#39d353]/15",
  };
  
  return (
    <button className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
