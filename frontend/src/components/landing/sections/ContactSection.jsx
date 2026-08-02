import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, MessageSquare, Send, User } from 'lucide-react';

export const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    // Simulate sending email API request
    setTimeout(() => {
      toast.success("Message sent successfully! Our team will contact you soon.");
      setFormData({ name: '', email: '', message: '' });
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <section id="contact" className="w-full max-w-7xl mx-auto px-6 py-32 min-h-[70vh] flex flex-col justify-center items-center text-center relative z-20 bg-[#020503]">
      <div className="w-full max-w-3xl border border-neutral-800 bg-[#111111]/80 backdrop-blur-xl p-8 md:p-14 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-[#39d353] to-transparent"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#39d353]/10 rounded-full blur-[100px] pointer-events-none"></div>

        <h2 className="text-[#39d353] text-sm font-bold font-mono tracking-widest uppercase mb-4 drop-shadow-md">
          GET IN TOUCH
        </h2>
        <h3 className="text-[60px] font-display font-black tracking-tighter uppercase text-white mb-6 drop-shadow-lg leading-[0.9]">
          Any Queries?
        </h3>
        <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
          Encountered a problem or want to discuss a partnership? Send us a message and it will go straight to our team's inbox.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <label className="text-xs text-gray-500 font-bold font-mono uppercase mb-2 block">Name</label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-4 text-gray-500" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full bg-[#020503] border border-neutral-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[#39d353] transition-colors"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs text-gray-500 font-bold font-mono uppercase mb-2 block">Email</label>
              <div className="relative flex items-center">
                <Mail size={18} className="absolute left-4 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="w-full bg-[#020503] border border-neutral-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[#39d353] transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="relative mt-2">
            <label className="text-xs text-gray-500 font-bold font-mono uppercase mb-2 block">Message</label>
            <div className="relative flex items-start">
              <MessageSquare size={18} className="absolute left-4 top-4 text-gray-500" />
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="How can we help you?"
                rows={4}
                className="w-full bg-[#020503] border border-neutral-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[#39d353] transition-colors resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 flex items-center justify-center gap-2 bg-[#39d353] text-black font-bold px-8 py-4 rounded-xl hover:bg-white hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send size={18} />
                SEND MESSAGE
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-20 text-gray-600 text-sm font-mono tracking-widest flex flex-col items-center gap-2">
        <span>© {new Date().getFullYear()} CODERUSH. ALL RIGHTS RESERVED.</span>
      </div>
    </section>
  );
};
