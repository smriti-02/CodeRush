import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Bot } from 'lucide-react';

const LoadingText = () => {
  const [textIndex, setTextIndex] = useState(0);
  const texts = [
    "Sending games to AI...",
    "Nemotron is reading your code...",
    "Analyzing time and space complexity...",
    "Finding weaknesses in your approach...",
    "Generating actionable feedback...",
    "Formatting markdown...",
    "Almost there..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % texts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [texts.length]);

  return <p className="font-mono text-sm animate-pulse">{texts[textIndex]}</p>;
};

export default function AIReviewModal({ isOpen, onClose, title, content, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111111] border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#161616]">
          <div className="flex items-center gap-3">
            <Bot className="text-[#39d353]" size={24} />
            <h2 className="text-xl font-bold text-white font-display tracking-wide">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors bg-neutral-800/50 hover:bg-neutral-800 p-2 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0a0a0a]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 py-12">
              <Bot className="animate-bounce text-[#39d353]" size={48} />
              <LoadingText />
            </div>
          ) : (
            <div className="prose prose-invert prose-pre:bg-[#161616] prose-pre:border prose-pre:border-neutral-800 max-w-none text-gray-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-[#161616] flex justify-between">
          <button 
            onClick={() => {
              const element = document.createElement("a");
              const file = new Blob([content], {type: 'text/markdown'});
              element.href = URL.createObjectURL(file);
              element.download = "CodeRush_AI_Review.md";
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }}
            className="px-4 py-2 bg-[#39d353]/10 text-[#39d353] border border-[#39d353]/30 font-bold rounded hover:bg-[#39d353] hover:text-black transition-colors"
          >
            Download Markdown
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-neutral-800 text-white font-bold rounded hover:bg-neutral-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
}
