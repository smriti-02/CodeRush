import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Medal, Clock, Zap, Target, Flame, 
  ArrowUpRight, ArrowDownRight, Search, Settings, ShieldCheck, Brain, Plus, Loader2
} from 'lucide-react';
import axiosInstance from '../api/axios';

export default function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Games');
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [friendUsername, setFriendUsername] = useState("");
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState("");

  const tabs = ['Games', 'Stats', 'Friends'];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosInstance.get('/users/profile');
        setProfile(res.data.data);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendUsername.trim()) return;
    setFriendLoading(true);
    setFriendError("");
    try {
      const res = await axiosInstance.post('/users/add-friend', { friendUsername: friendUsername.trim() });
      setProfile(prev => ({
        ...prev,
        friends: [...prev.friends, res.data.data]
      }));
      setFriendUsername("");
    } catch (error) {
      setFriendError(error.response?.data?.message || "Error adding friend");
    } finally {
      setFriendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#39d353]" size={48} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center text-white">
        Failed to load profile.
      </div>
    );
  }

  const ratingCategories = [
    { name: 'Overall Elo', score: profile.elo || 0, change: '+0', icon: <Medal size={20} className="text-yellow-500" />, trend: 'up' },
    { name: 'Problems', score: profile.problemsSolved || 0, change: '+0', icon: <Target size={20} className="text-purple-500" />, trend: 'up' },
    { name: 'Wins', score: profile.stats?.wins || 0, change: '+0', icon: <Zap size={20} className="text-blue-500" />, trend: 'up' },
    { name: 'Games', score: profile.stats?.totalGames || 0, change: '+0', icon: <Flame size={20} className="text-red-500" />, trend: 'up' },
  ];

  return (
    <div className="min-h-screen bg-[#111111] text-gray-300 font-sans selection:bg-[#39d353]/30">
      
      {/* Top Navbar */}
      <div className="h-14 bg-[#161512] border-b border-neutral-800/50 flex justify-between items-center px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-[#39d353] font-display tracking-widest uppercase">CodeRush</h1>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        
        {/* LEFT COLUMN - MAIN CONTENT */}
        <div className="space-y-6">
          
          {/* Header Profile Card */}
          <div className="bg-[#1a1917] rounded-xl border border-neutral-800/60 p-6 flex flex-col md:flex-row gap-6 shadow-xl relative overflow-hidden">
            <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-neutral-800 to-[#111] border border-neutral-700/50 flex items-center justify-center shadow-lg relative group overflow-hidden shrink-0">
               <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}&backgroundColor=1a1917`} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    {profile.username}
                  </h1>
                  <p className="text-gray-400 text-sm font-medium mt-1">{profile.email}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-gray-500 pt-3 border-t border-neutral-800/50 mt-4">
                <span>{new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} Joined</span>
                <span>{profile.friends?.length || 0} Friends</span>
                <span className="text-[#39d353] flex items-center gap-1.5 bg-[#39d353]/10 px-2 py-0.5 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-[#39d353] animate-pulse"></div> {profile.status === 'online' ? 'Online now' : 'Online'}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto custom-scrollbar border-b border-neutral-800/60 pb-px">
            {tabs.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-bold tracking-wide transition-colors whitespace-nowrap border-b-2 ${activeTab === tab ? 'text-white border-[#39d353]' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Rating Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ratingCategories.map((cat) => (
              <div key={cat.name} className="bg-[#1a1917] hover:bg-[#1e1d1a] transition-colors rounded-lg border border-neutral-800/60 p-4 flex flex-col group cursor-pointer relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  {cat.icon}
                  <span className="font-bold text-gray-400 text-sm tracking-wide">{cat.name}</span>
                </div>
                <div className="flex items-end justify-between z-10">
                  <span className="text-3xl font-black text-white font-mono">{cat.score}</span>
                  <span className={`text-xs font-bold mb-1.5 flex items-center gap-0.5 ${cat.trend === 'up' ? 'text-[#39d353]' : 'text-red-500'}`}>
                    {cat.trend === 'up' ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} 
                    {cat.change.replace('+', '').replace('-', '')}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none">
                  <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                    <polyline points="0,30 20,25 40,28 60,15 80,20 100,5" fill="none" stroke={cat.trend === 'up' ? '#39d353' : '#ef4444'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Game History */}
          <div className="bg-[#1a1917] rounded-xl border border-neutral-800/60 overflow-hidden shadow-lg">
            <div className="p-4 bg-[#1e1d1a] border-b border-neutral-800/60 flex items-center justify-between">
              <h3 className="font-bold text-gray-300 tracking-wide text-sm">Game History <span className="text-gray-500 ml-1 font-normal">({profile.gameHistory?.length || 0})</span></h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#161512] text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-medium">Opponent</th>
                    <th className="px-4 py-3 font-medium text-center">Result</th>
                    <th className="px-4 py-3 font-medium text-center">Mode</th>
                    <th className="px-4 py-3 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {profile.gameHistory?.map((game) => {
                    const opponentObj = game.players.find(p => p.user && p.user._id !== profile._id);
                    const opponent = opponentObj ? opponentObj.user : { username: 'Unknown', elo: 0 };
                    
                    let resultType = 'draw';
                    if (game.winner === profile._id) resultType = 'won';
                    else if (game.winner && game.winner !== profile._id) resultType = 'lost';

                    return (
                      <tr key={game._id} className="hover:bg-[#22211f] transition-colors group cursor-pointer">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center shrink-0">
                              <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${opponent.username}&backgroundColor=1a1917`} className="w-full h-full object-cover rounded" alt=""/>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{opponent.username} <span className="text-gray-500 font-normal">({opponent.elo})</span></span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center justify-center font-mono text-xs font-bold">
                            {resultType === 'won' && <span className="text-[#39d353]">WON</span>}
                            {resultType === 'lost' && <span className="text-red-500">LOST</span>}
                            {resultType === 'draw' && <span className="text-gray-400">DRAW</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-gray-400 font-mono text-xs uppercase">{game.settings?.mode || 'Classic'}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-500 text-xs">{new Date(game.createdAt).toLocaleDateString()}</span>
                            <button className="px-3 py-1 bg-[#262421] hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/30 border border-neutral-700 text-gray-300 rounded text-xs font-bold transition-all flex items-center gap-1">
                              <Brain size={12} /> AI Review
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {(!profile.gameHistory || profile.gameHistory.length === 0) && (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-gray-500 text-sm">No game history available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - SIDEBAR */}
        <div className="space-y-6">
          
          {/* Add Friend Panel */}
          <div className="bg-[#1a1917] rounded-xl border border-neutral-800/60 p-4 shadow-lg">
            <h3 className="font-bold text-gray-200 tracking-wide text-sm mb-3">Add Friend</h3>
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <input 
                type="text" 
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                placeholder="Username..." 
                className="flex-1 bg-[#222] border border-neutral-700 rounded-md py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#39d353] text-white placeholder-gray-500"
              />
              <button 
                type="submit" 
                disabled={friendLoading}
                className="bg-[#39d353] text-black px-3 py-1.5 rounded-md text-xs font-bold hover:bg-[#2ea043] transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {friendLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </button>
            </form>
            {friendError && <p className="text-red-500 text-[10px] mt-2 font-medium">{friendError}</p>}
          </div>

          {/* Friends Panel */}
          <div className="bg-[#1a1917] rounded-xl border border-neutral-800/60 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-200 tracking-wide text-sm">Friends <span className="text-[10px] font-bold bg-neutral-800 text-gray-400 px-2 py-0.5 rounded-full ml-1">{profile.friends?.length || 0}</span></h3>
            </div>
            
            <div className="space-y-3">
              {profile.friends?.map((friend, i) => (
                <div key={i} className="flex items-center gap-3 p-2 hover:bg-[#22211f] rounded-lg transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded bg-neutral-800 flex items-center justify-center relative shrink-0">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}&backgroundColor=111`} className="w-full h-full object-cover rounded" alt=""/>
                    {friend.status === 'online' && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#39d353] rounded-full border-2 border-[#1a1917]"></div>}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{friend.username}</h4>
                    <p className="text-xs text-gray-500 font-mono">Elo: {friend.elo || 0}</p>
                  </div>
                </div>
              ))}
              {(!profile.friends || profile.friends.length === 0) && (
                <p className="text-xs text-gray-500 text-center py-4">You have no friends yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Global Scrollbar style for Profile specifically if needed */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
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
