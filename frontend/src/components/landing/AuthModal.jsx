import React, { useState } from 'react';
import axios from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, Mail, Lock, User } from 'lucide-react';

export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setFormData({ username: '', email: '', password: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (mode === 'login') {
        const response = await axios.post("/users/login", {
          email: formData.email,
          password: formData.password
        });
        if (response.data.success) {
          toast.success("Welcome back!");
          onClose();
          navigate("/dashboard");
        }
      } else {
        const response = await axios.post("/users/register", formData);
        if (response.data.success) {
          toast.success("Account created! Logging you in...");
          // Automatically log them in or ask to login
          setMode('login');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `${mode === 'login' ? 'Login' : 'Registration'} failed`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueWithGoogle = () => {
    window.location.href = "http://localhost:8000/api/v1/users/auth/google";
  };

  const continueWithGithub = () => {
    window.location.href = "http://localhost:8000/api/v1/users/auth/github";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#0a0a0a]/90 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(57,211,83,0.15)] overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-[#39d353] to-transparent"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#39d353]/10 rounded-full blur-[100px] pointer-events-none"></div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8 mt-2">
          <h2 className="text-[#39d353] text-xs font-bold font-mono tracking-widest uppercase mb-2">
            {mode === 'login' ? 'WELCOME BACK' : 'JOIN THE ARENA'}
          </h2>
          <h3 className="text-4xl font-display font-black tracking-tighter uppercase text-white">
            {mode === 'login' ? 'Login' : 'Register'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="relative">
              <label className="text-xs text-gray-500 font-bold font-mono uppercase mb-2 block">Username</label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-4 text-gray-500" />
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="CodeNinja" 
                  className="w-full bg-[#111111] border border-neutral-800 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[#39d353] transition-colors"
                />
              </div>
            </div>
          )}

          <div className="relative">
            <label className="text-xs text-gray-500 font-bold font-mono uppercase mb-2 block">Email</label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-4 text-gray-500" />
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="hacker@example.com" 
                className="w-full bg-[#111111] border border-neutral-800 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[#39d353] transition-colors"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-xs text-gray-500 font-bold font-mono uppercase mb-2 block">Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 text-gray-500" />
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••" 
                className="w-full bg-[#111111] border border-neutral-800 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[#39d353] transition-colors"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-[#39d353] text-black font-bold font-mono tracking-widest px-8 py-4 rounded-xl hover:bg-white hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100 uppercase"
          >
            {isSubmitting ? 'Loading...' : mode}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px bg-neutral-800 flex-1"></div>
          <span className="text-xs text-gray-500 font-mono uppercase">Or continue with</span>
          <div className="h-px bg-neutral-800 flex-1"></div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={continueWithGoogle}
            className="flex-1 flex justify-center items-center gap-2 bg-[#111111] border border-neutral-800 text-white py-3 rounded-xl hover:bg-white hover:text-black hover:border-white transition-all text-sm font-bold font-mono"
          >
            Google
          </button>
          <button 
            onClick={continueWithGithub}
            className="flex-1 flex justify-center items-center gap-2 bg-[#111111] border border-neutral-800 text-white py-3 rounded-xl hover:bg-white hover:text-black hover:border-white transition-all text-sm font-bold font-mono"
          >
            GitHub
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 font-mono">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={toggleMode}
            className="text-[#39d353] hover:text-white font-bold transition-colors"
          >
            {mode === 'login' ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
};
