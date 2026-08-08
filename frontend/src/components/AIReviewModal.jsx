import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { X, Bot, Send, User } from 'lucide-react';
import axiosInstance from '../api/axios';

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
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef(null);

  // Reset chat when modal opens/closes or content changes
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setChatInput("");
    }
  }, [isOpen, content]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatting]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting) return;
    
    const userMsg = { role: "user", content: chatInput.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput("");
    setIsChatting(true);

    try {
      const res = await axiosInstance.post('/ai/chat', {
        context: content,
        messages: newMessages
      });
      setMessages([...newMessages, { role: "assistant", content: res.data.data }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I couldn't process your request. Please try again." }]);
    } finally {
      setIsChatting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111111] border border-neutral-800 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#161616] shrink-0">
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

        {/* Content & Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0a0a0a] flex flex-col gap-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 py-12">
              <Bot className="animate-bounce text-[#39d353]" size={48} />
              <LoadingText />
            </div>
          ) : (
            <>
              {/* Initial Review Content */}
              <div className="prose prose-invert prose-pre:bg-[#161616] prose-pre:border prose-pre:border-neutral-800 max-w-none text-gray-300">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
              </div>

              {/* Separator if there are messages */}
              {messages.length > 0 && <div className="border-t border-neutral-800 my-4" />}

              {/* Chat Messages */}
              <div className="flex flex-col gap-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-[#39d353]/20 text-[#39d353]' : 'bg-blue-500/20 text-blue-400'}`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-[#161616] border border-neutral-800 rounded-tr-sm text-gray-300' : 'bg-[#1a1a1a] border border-neutral-800 rounded-tl-sm text-gray-300'}`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isChatting && (
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400">
                      <Bot size={16} />
                    </div>
                    <div className="bg-[#1a1a1a] border border-neutral-800 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </>
          )}
        </div>

        {/* Footer with Chat Input */}
        <div className="shrink-0 px-6 py-4 border-t border-neutral-800 bg-[#161616] flex flex-col gap-4">
          {!loading && (
            <div className="flex gap-2">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask a follow-up question about this review..."
                disabled={isChatting}
                className="flex-1 bg-[#0a0a0a] border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#39d353] disabled:opacity-50"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isChatting || !chatInput.trim()}
                className="bg-[#39d353] text-black p-2 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10"
              >
                <Send size={18} />
              </button>
            </div>
          )}

          <div className="flex justify-between items-center">
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
              className="text-xs text-gray-500 hover:text-[#39d353] transition-colors underline underline-offset-2"
            >
              Download Original Review
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-neutral-800 text-white text-sm font-bold rounded-lg hover:bg-neutral-700 transition-colors"
            >
              Close
            </button>
          </div>
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
