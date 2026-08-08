import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Users, Medal, Clock, Zap, Target, Flame, 
  Search, Settings, ShieldCheck, Brain, Plus, Loader2, Check, X
} from 'lucide-react';
import axiosInstance from '../api/axios';
import toast from 'react-hot-toast';
import AIReviewModal from '../components/AIReviewModal';

export default function Profile() {
  const navigate = useNavigate();
  const { usernameParam } = useParams();
  const [activeTab, setActiveTab] = useState('Games');
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [friendUsername, setFriendUsername] = useState("");
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState("");

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiReviewTitle, setAiReviewTitle] = useState("");
  const [aiReviewContent, setAiReviewContent] = useState("");
  const [aiReviewLoading, setAiReviewLoading] = useState(false);

  const tabs = ['Games', 'Stats', 'Friends'];

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const url = usernameParam ? `/users/profile?username=${usernameParam}` : `/users/profile`;
        const res = await axiosInstance.get(url);
        setProfile(res.data.data);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [usernameParam]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!friendUsername.trim()) return;
    setFriendLoading(true);
    setFriendError("");
    try {
      await axiosInstance.post('/users/friend-request', { friendUsername: friendUsername.trim() });
      toast.success('Friend request sent!');
      setFriendUsername("");
    } catch (error) {
      setFriendError(error.response?.data?.message || "Error sending request");
    } finally {
      setFriendLoading(false);
    }
  };

  const handleAcceptRequest = async (requesterId) => {
    try {
      const res = await axiosInstance.post('/users/accept-friend', { requesterId });
      setProfile(prev => ({
        ...prev,
        friendRequests: prev.friendRequests.filter(req => req._id !== requesterId),
        friends: [...prev.friends, res.data.data]
      }));
      toast.success('Friend request accepted!');
    } catch (error) {
      toast.error(error.response?.data?.message || "Error accepting request");
    }
  };

  const handleRejectRequest = async (requesterId) => {
    try {
      await axiosInstance.post('/users/reject-friend', { requesterId });
      setProfile(prev => ({
        ...prev,
        friendRequests: prev.friendRequests.filter(req => req._id !== requesterId)
      }));
      toast.success('Friend request rejected');
    } catch (error) {
      toast.error(error.response?.data?.message || "Error rejecting request");
    }
  };

  const handleGameReview = async (gameId, opponentName) => {
    setAiReviewTitle(`Game Review vs ${opponentName}`);
    setAiReviewContent("");
    setAiReviewLoading(true);
    setAiModalOpen(true);
    
    try {
      const res = await axiosInstance.get(`/ai/game-review/${gameId}`);
      setAiReviewContent(res.data.data);
    } catch (err) {
      setAiReviewContent("Failed to generate AI review. Make sure you played in this match and the API is configured.");
    } finally {
      setAiReviewLoading(false);
    }
  };

  const handleAccountAnalysis = async () => {
    setAiReviewTitle("AI Account Analysis");
    setAiReviewContent("");
    setAiReviewLoading(true);
    setAiModalOpen(true);
    
    try {
      const res = await axiosInstance.get(`/ai/account-analysis`);
      setAiReviewContent(res.data.data);
    } catch (err) {
      setAiReviewContent("Failed to generate account analysis. Make sure the API is configured.");
    } finally {
      setAiReviewLoading(false);
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
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center text-white gap-4">
        <h2 className="text-xl font-bold">Failed to load profile.</h2>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-neutral-800 rounded">Go Home</button>
      </div>
    );
  }

  const ratingCategories = [
    { name: 'Overall Elo', score: profile.elo || 0, icon: <Medal size={20} className="text-yellow-500" /> },
    { name: 'Problems', score: profile.problemsSolved || 0, icon: <Target size={20} className="text-purple-500" /> },
    { name: 'Wins', score: profile.stats?.wins || 0, icon: <Zap size={20} className="text-blue-500" /> },
    { name: 'Games', score: profile.stats?.totalGames || 0, icon: <Flame size={20} className="text-red-500" /> },
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
            
            {/* Account Analyzer Button */}
            {!usernameParam && (
              <div className="absolute top-6 right-6">
                <button 
                  onClick={handleAccountAnalysis}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/40 hover:to-purple-600/40 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                >
                  <Brain size={16} /> Analyze Account
                </button>
              </div>
            )}
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
                    <th className="px-4 py-3 font-medium text-center">Question</th>
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
                          <Link to={`/profile/${opponent.username}`} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center shrink-0">
                              <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${opponent.username}&backgroundColor=1a1917`} className="w-full h-full object-cover rounded" alt=""/>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-300 group-hover:text-[#39d353] transition-colors">{opponent.username} <span className="text-gray-500 font-normal">({opponent.elo})</span></span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center justify-center font-mono text-xs font-bold">
                            {resultType === 'won' && <span className="text-[#39d353] bg-[#39d353]/10 px-2 py-1 rounded">+{game.eloChange || 0}</span>}
                            {resultType === 'lost' && <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded">-{game.eloChange || 0}</span>}
                            {resultType === 'draw' && <span className="text-gray-400 bg-gray-500/10 px-2 py-1 rounded">0</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {game.questions && game.questions.length > 0 ? (
                            <Link to={`/practice/${game._id}`} className="text-xs font-bold text-gray-300 hover:text-[#39d353] hover:underline transition-colors">
                              {game.questions[0].title || 'See Question'}
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-500 text-xs">{new Date(game.createdAt).toLocaleDateString()}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleGameReview(game._id, opponent.username); }}
                              className="px-3 py-1 bg-[#262421] hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/30 border border-neutral-700 text-gray-300 rounded text-xs font-bold transition-all flex items-center gap-1"
                            >
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
          
          {/* Add Friend & Requests Panel - ONLY SHOW ON OWN PROFILE */}
          {!usernameParam && (
            <>
              {/* Friend Requests */}
              {profile.friendRequests && profile.friendRequests.length > 0 && (
                <div className="bg-[#1a1917] rounded-xl border border-[#39d353]/30 p-4 shadow-[0_0_15px_rgba(57,211,83,0.1)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#39d353]"></div>
                  <h3 className="font-bold text-gray-200 tracking-wide text-sm mb-3">Pending Requests</h3>
                  <div className="space-y-2">
                    {profile.friendRequests.map(req => (
                      <div key={req._id} className="flex items-center justify-between bg-[#22211f] p-2 rounded-lg border border-neutral-800">
                        <Link to={`/profile/${req.username}`} className="flex items-center gap-2 group">
                          <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${req.username}&backgroundColor=111`} className="w-8 h-8 rounded" alt=""/>
                          <div>
                            <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{req.username}</p>
                            <p className="text-[10px] text-gray-500 font-mono">Elo: {req.elo || 0}</p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleAcceptRequest(req._id)} className="w-7 h-7 flex items-center justify-center bg-[#39d353]/20 text-[#39d353] hover:bg-[#39d353] hover:text-black rounded transition-colors">
                            <Check size={14} />
                          </button>
                          <button onClick={() => handleRejectRequest(req._id)} className="w-7 h-7 flex items-center justify-center bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Friend Panel */}
              <div className="bg-[#1a1917] rounded-xl border border-neutral-800/60 p-4 shadow-lg">
                <h3 className="font-bold text-gray-200 tracking-wide text-sm mb-3">Send Friend Request</h3>
                <form onSubmit={handleSendRequest} className="flex gap-2">
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
            </>
          )}

          {/* Friends Panel */}
          <div className="bg-[#1a1917] rounded-xl border border-neutral-800/60 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-200 tracking-wide text-sm">Friends <span className="text-[10px] font-bold bg-neutral-800 text-gray-400 px-2 py-0.5 rounded-full ml-1">{profile.friends?.length || 0}</span></h3>
            </div>
            
            <div className="space-y-3">
              {profile.friends?.map((friend, i) => (
                <Link to={`/profile/${friend.username}`} key={i} className="flex items-center gap-3 p-2 hover:bg-[#22211f] rounded-lg transition-colors group">
                  <div className="w-10 h-10 rounded bg-neutral-800 flex items-center justify-center relative shrink-0">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}&backgroundColor=111`} className="w-full h-full object-cover rounded" alt=""/>
                    {friend.status === 'online' && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#39d353] rounded-full border-2 border-[#1a1917]"></div>}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-300 group-hover:text-[#39d353] transition-colors">{friend.username}</h4>
                    <p className="text-xs text-gray-500 font-mono">Elo: {friend.elo || 0}</p>
                  </div>
                </Link>
              ))}
              {(!profile.friends || profile.friends.length === 0) && (
                <p className="text-xs text-gray-500 text-center py-4">No friends yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <AIReviewModal 
        isOpen={aiModalOpen} 
        onClose={() => setAiModalOpen(false)} 
        title={aiReviewTitle} 
        content={aiReviewContent} 
        loading={aiReviewLoading} 
      />

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
