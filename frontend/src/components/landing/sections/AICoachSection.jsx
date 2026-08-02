import React from 'react';
import { Target, Code2, MessageSquare, LineChart, ChevronRight, Trophy } from 'lucide-react';
import HeroButton from '../HeroButton';
import FeatureCard from '../FeatureCard';

export const AICoachSection = () => {
  return (
    <section id="ai-coach" className="w-full max-w-7xl mx-auto px-6 py-16 relative z-10 min-h-[100vh] flex flex-col justify-center pointer-events-none">
      <div className="pointer-events-auto mt-24">
        <div className="flex flex-col md:flex-row items-center justify-between mb-32">
          <div className="md:w-1/2">
            <h2 className="text-[#39d353] text-sm font-bold tracking-widest uppercase mb-4 drop-shadow-md">
              03 AI COACH + FEATURES
            </h2>
            <h3 className="text-[70px] font-black tracking-tighter uppercase text-white mb-6 leading-[0.9] drop-shadow-lg">
              LEVEL UP WITH<br/>
              <span className="text-[#39d353]">YOUR AI COACH</span>
            </h3>
            <p className="text-gray-400 text-lg mb-10 max-w-md leading-relaxed">
              Get personalized guidance, smart feedback, and practice that adapts to your skills.
              Your journey to mastery, powered by AI.
            </p>
            <HeroButton variant="primary" className="px-8 py-4 bg-[#39d353] text-black">
              MEET YOUR COACH
            </HeroButton>
          </div>

          <div className="md:w-1/2 relative flex justify-center mt-12 md:mt-0">
            {/* Background glowing ring behind the 3D robot */}
            <div className="relative w-80 h-80 bg-gradient-to-b from-[#39d353]/5 to-transparent rounded-full flex items-center justify-center animate-pulse shadow-[0_0_150px_rgba(57,211,83,0.1)] pointer-events-none">
               {/* Floating UI Elements removed as per user request */}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-20 mt-12">
          <FeatureCard 
            icon={<Target size={32} className="text-[#39d353]" />} 
            title="Smart Analysis" 
            description="AI analyzes your code and finds weak points." 
          />
          <FeatureCard 
            icon={<Code2 size={32} className="text-[#39d353]" />} 
            title="Personalized Paths" 
            description="Get custom practice sets made for you." 
          />
          <FeatureCard 
            icon={<MessageSquare size={32} className="text-[#39d353]" />} 
            title="Instant Feedback" 
            description="Improve faster with real-time AI suggestions." 
          />
          <FeatureCard 
            icon={<LineChart size={32} className="text-[#39d353]" />} 
            title="Track Progress" 
            description="Monitor your growth and stay motivated." 
          />
        </div>
      </div>
    </section>
  );
};
