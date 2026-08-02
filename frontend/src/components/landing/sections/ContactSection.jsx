import React from 'react';

export const ContactSection = () => {
  return (
    <section id="contact" className="w-full max-w-7xl mx-auto px-6 py-24 min-h-[50vh] flex flex-col justify-center items-center text-center relative z-20 bg-[#020503]">
      <div className="max-w-2xl border border-neutral-800 bg-[#111111]/80 backdrop-blur-xl p-12 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-[#39d353] to-transparent"></div>
        <h2 className="text-[#39d353] text-sm font-bold tracking-widest uppercase mb-4">
          CONTACT US
        </h2>
        <h3 className="text-4xl font-black tracking-tighter uppercase text-white mb-6">
          Ready to Battle?
        </h3>
        <p className="text-gray-400 text-lg mb-10">
          Have questions or want to partner with us? Drop us a line and our team will get back to you shortly.
        </p>
        <div className="flex gap-4 justify-center">
          <input 
            type="email" 
            placeholder="Enter your email" 
            className="bg-[#020503] border border-neutral-700 text-white px-6 py-3 rounded-xl focus:outline-none focus:border-[#39d353] transition-colors w-64"
          />
          <button className="bg-[#39d353] text-black font-bold px-8 py-3 rounded-xl hover:bg-white transition-colors">
            SUBSCRIBE
          </button>
        </div>
      </div>
      <div className="mt-16 text-gray-600 text-sm font-mono">
        © 2026 CodeRush. All Rights Reserved.
      </div>
    </section>
  );
};
