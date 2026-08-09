import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { socket } from '../api/socket';
import { Panel, Group, Separator } from "react-resizable-panels";
import {
  GripVertical,
  GripHorizontal,
  Play,
  User,
  Cpu,
  Mail,
  Info,
  Clock,
  Tags,
  Target,
  Settings2,
  Terminal,
  Code2,
  Trophy,
  Users,
  ChevronRight
} from "lucide-react";
import axiosInstance from '../api/axios';

const AVAILABLE_TOPICS = [
  "Array", "String", "Math", "Hash Table",
  "Two Pointers", "Sliding Window", "Dynamic Programming", "Linked List"
];

const TIME_LIMITS = [10, 20, 30, 45, 60];

const TIPS = [
  "Tip: Use Hash Maps for O(1) lookups when checking for existence.",
  "Tip: Watch out for integer overflow in languages like C++ or Java.",
  "Tip: Sliding window is perfect for contiguous subarray problems.",
  "Tip: Fast I/O can be the difference between TLE and AC.",
  "Tip: Binary search isn't just for arrays—use it for finding monotonic answers.",
  "Tip: Don't forget to handle edge cases like empty inputs or n=0!"
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // Settings State
  const [selectedTopics, setSelectedTopics] = useState(() => {
    const saved = localStorage.getItem('cr_topics');
    return saved ? JSON.parse(saved) : ["Array"];
  });
  const [timeLimit, setTimeLimit] = useState(() => {
    const saved = localStorage.getItem('cr_timeLimit');
    return saved ? JSON.parse(saved) : 20;
  });
  const [difficulty, setDifficulty] = useState(() => {
    const saved = localStorage.getItem('cr_difficulty');
    return saved ? JSON.parse(saved) : 'medium';
  });
  const [strictMode, setStrictMode] = useState(() => {
    const saved = localStorage.getItem('cr_strictMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('cr_topics', JSON.stringify(selectedTopics));
    localStorage.setItem('cr_timeLimit', JSON.stringify(timeLimit));
    localStorage.setItem('cr_difficulty', JSON.stringify(difficulty));
    localStorage.setItem('cr_strictMode', JSON.stringify(strictMode));
  }, [selectedTopics, timeLimit, difficulty, strictMode]);

  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosInstance.get('/users/profile');
        setUserProfile(res.data.data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/');
        }
      }
    };
    fetchProfile();
  }, []);

  // Socket & Matchmaking State
  const [playerStats, setPlayerStats] = useState({ online: 0, playing: 0, inQueue: 0 });
  const [proposal, setProposal] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  // Terminal & Code Animation State
  const [typedCode, setTypedCode] = useState("");
  const [terminalLogs, setTerminalLogs] = useState([]);

  // 1. Socket Connections
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleMatchFound = (data) => {
      setProposal(null);
      setIsSearching(false);
      setTerminalLogs(prev => [...prev, "> [System] Match Found! Entering Arena..."]);
      setTimeout(() => {
        toast.success("Entering Arena...");
        navigate(`/arena/${data.gameId}`);
      }, 800);
    };

    const handleMatchProposed = (data) => {
      setTerminalLogs(prev => [...prev, "> [System] Compromise match proposed... waiting for user input."]);
      setProposal(data);
    };

    const handleProposalDeclined = (data) => {
      setProposal(null);
      setTerminalLogs(prev => [...prev, `> [System] ${data.message || "Match declined."} Resuming search...`]);
      toast.error(data.message || "Match declined. Back in queue.");
    };

    socket.on("matchFound", handleMatchFound);
    socket.on("matchProposed", handleMatchProposed);
    socket.on("proposalDeclined", handleProposalDeclined);
    socket.on("playerCountUpdate", setPlayerStats);

    return () => {
      socket.off("matchFound", handleMatchFound);
      socket.off("matchProposed", handleMatchProposed);
      socket.off("proposalDeclined", handleProposalDeclined);
      socket.off("playerCountUpdate", setPlayerStats);
    };
  }, [navigate]);

  // 2. Timer & Terminal Tips logic
  useEffect(() => {
    let timerInterval;
    let tipsInterval;

    if (isSearching) {
      // Start terminal with initial logs
      setTerminalLogs([
        "> [System] Initializing matchmaking engine...",
        `> [Config] Time: ${timeLimit}m | Diff: ${difficulty} | Strict: ${strictMode}`,
        "> [System] Searching for opponent..."
      ]);

      timerInterval = setInterval(() => {
        setSearchTime((prev) => prev + 1);
      }, 1000);

      tipsInterval = setInterval(() => {
        const randomTip = TIPS[Math.floor(Math.random() * TIPS.length)];
        setTerminalLogs(prev => [...prev, `> [Tip] ${randomTip}`]);
      }, 7000);

    } else {
      setSearchTime(0);
      setTerminalLogs(["> [System] Idle. Configure your match and hit Run."]);
      clearInterval(timerInterval);
      clearInterval(tipsInterval);
    }

    return () => {
      clearInterval(timerInterval);
      clearInterval(tipsInterval);
    };
  }, [isSearching, timeLimit, difficulty, strictMode]);

  // 3. Dynamic Code Animation
  const generateCode = () => {
    return `// CodeRush Matchmaking Configuration
const player = "CodeRusher"; // Current User
const timeLimit = "${timeLimit} mins";
const tags = [${selectedTopics.map(t => `"${t}"`).join(', ')}];
const difficulty = "${difficulty}";
const strictMatch = ${strictMode};

// Ready to connect to socket...
const joinQueue = () => {
  socket.emit("findMatch", { timeLimit, tags, difficulty, strictMatch });
};`;
  };

  const fullCode = generateCode();

  useEffect(() => {
    let i = 0;
    setTypedCode("");
    const interval = setInterval(() => {
      setTypedCode(fullCode.slice(0, i));
      i++;
      if (i > fullCode.length) clearInterval(interval);
    }, 8); // Fast typewriter effect
    return () => clearInterval(interval);
  }, [fullCode]); // Re-run when settings change

  const toggleTopic = (topic) => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const handleJoinQueue = () => {
    if (selectedTopics.length === 0) {
      toast.error("Please select at least one topic.");
      return;
    }
    setIsSearching(true);
    socket.emit("findMatch", {
      topics: selectedTopics,
      timeLimit,
      difficulty,
      strictMode
    });
  };

  useEffect(() => {
    if (location.state?.requeue) {
      handleJoinQueue();
      // Clear the state so it doesn't requeue again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleCancelSearch = () => {
    setIsSearching(false);
    socket.emit("leaveQueue");
    toast.success("Left matchmaking queue.");
  };

  const acceptProposal = () => {
    socket.emit("acceptProposal", { proposalId: proposal.proposalId });
    setTerminalLogs(prev => [...prev, "> [System] Proposal accepted. Waiting for opponent..."]);
    toast.success("Accepted! Waiting for opponent...");
  };

  const rejectProposal = () => {
    socket.emit("rejectProposal", { proposalId: proposal.proposalId });
    setProposal(null);
    setTerminalLogs(prev => [...prev, "> [System] Proposal rejected. Resuming search..."]);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="h-screen w-screen bg-[#020503] text-gray-300 overflow-hidden font-sans flex flex-col">

      {/* 1. TOP NAV */}
      <div className="flex-none h-14 bg-[#0a0a0a] border-b border-neutral-800 flex justify-between items-center px-6">
        <div className="flex items-center gap-8">
          <h1 onClick={() => navigate('/')} className="text-xl font-bold text-[#39d353] font-display tracking-widest uppercase cursor-pointer hover:scale-105 transition-transform duration-300">CodeRush</h1>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-400">
            <button onClick={() => navigate('/#hero')} className="hover:text-white hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
              <Info size={16} /> About Us
            </button>
            <button onClick={() => navigate('/#contact')} className="hover:text-white hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
              <Mail size={16} /> Contact Us
            </button>
            <button onClick={() => navigate('/#ai-coach')} className="hover:text-white hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
              <Cpu size={16} /> AI Coach
            </button>
          </nav>
        </div>
        <div>
          <button onClick={() => navigate('/profile')} className="hover:text-[#39d353] text-gray-400 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 text-sm font-semibold">
            <User size={16} /> {userProfile?.username || 'Profile'}
          </button>
        </div>
      </div>

      {/* 2. IDE SPLIT SCREEN LAYOUT */}
      <div className="flex-1 overflow-hidden p-2">
        <Group orientation="horizontal" className="h-full rounded-xl overflow-hidden border border-neutral-800 bg-[#0a0a0a]">

          {/* LEFT PANEL: Settings */}
          <Panel id="settings-panel" order={1} defaultSize={35} minSize={25}>
            <div className="h-full flex flex-col bg-[#0a0a0a] relative">
              <div className="h-12 px-4 bg-[#111111] border-b border-neutral-800 flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
                <Settings2 size={16} className="text-[#39d353]" /> Matchmaking Settings
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-24">

                {/* Time Limit */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    <Clock size={14} /> Time Limit
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {TIME_LIMITS.map((time) => (
                      <button
                        key={time}
                        onClick={() => setTimeLimit(time)}
                        disabled={isSearching}
                        className={`py-2 rounded-lg text-xs font-bold font-mono transition-all ${timeLimit === time
                            ? 'bg-[#39d353]/20 text-[#39d353] border border-[#39d353]/50 shadow-[0_0_10px_rgba(57,211,83,0.2)]'
                            : 'bg-[#111111] text-gray-400 border border-neutral-800 hover:border-neutral-600 disabled:opacity-50 disabled:hover:border-neutral-800'
                          }`}
                      >
                        {time}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    <Target size={14} /> Difficulty
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['easy', 'medium', 'hard'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        disabled={isSearching}
                        className={`capitalize py-2 rounded-lg text-xs font-bold font-mono transition-all ${difficulty === level
                            ? level === 'easy'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                              : level === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-[#111111] text-gray-500 border border-neutral-800 hover:border-neutral-600 disabled:opacity-50 disabled:hover:border-neutral-800'
                          }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    <Tags size={14} /> Topics
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TOPICS.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        disabled={isSearching}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold font-mono uppercase transition-all ${selectedTopics.includes(topic)
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                            : 'bg-[#111111] text-gray-500 border border-neutral-800 hover:border-neutral-600 disabled:opacity-50 disabled:hover:border-neutral-800'
                          }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strict Mode */}
                <div className="flex items-center p-4 bg-[#111111] border border-neutral-800 rounded-lg">
                  <input
                    type="checkbox"
                    id="strictMode"
                    checked={strictMode}
                    onChange={(e) => setStrictMode(e.target.checked)}
                    disabled={isSearching}
                    className="w-4 h-4 text-[#39d353] bg-black border-neutral-700 rounded focus:ring-[#39d353] cursor-pointer"
                  />
                  <label htmlFor="strictMode" className="ml-3 text-xs font-bold text-gray-400 cursor-pointer hover:text-gray-200 transition-colors">
                    Strict Match (Wait for exact preferences)
                  </label>
                </div>
                
                {/* Profile Summary Widget */}
                {userProfile && (
                  <div 
                    onClick={() => navigate('/profile')}
                    className="mt-6 bg-[#111] border border-neutral-800 rounded-xl p-4 cursor-pointer hover:border-[#39d353]/50 hover:bg-[#1a1a1a] transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#39d353]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white tracking-wide">{userProfile.username}</span>
                          <span className="text-[10px] bg-[#39d353]/20 text-[#39d353] px-2 py-0.5 rounded-full font-mono border border-[#39d353]/30">
                            {userProfile.elo} ELO
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs font-mono text-gray-400 mt-2">
                          <span className="flex items-center gap-1.5">
                            <Trophy size={12} className="text-yellow-500" />
                            {userProfile.stats?.wins || 0} Wins
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users size={12} className="text-blue-400" />
                            {userProfile.friends?.length || 0} Friends
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-600 group-hover:text-[#39d353] group-hover:translate-x-1 transition-all" size={20} />
                    </div>
                  </div>
                )}

              </div>

              {/* Queue Stats (Bottom Anchor) */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none">
                <div className="bg-[#111111] border border-neutral-800 p-3 rounded-lg flex justify-between items-center shadow-lg pointer-events-auto">
                  <span className="text-xs font-bold font-mono text-gray-500">Live Server Status</span>
                  <span className="text-[11px] font-mono text-gray-400">
                    <span className="text-[#39d353]">{playerStats.online}</span> Online | <span className="text-blue-400">{playerStats.inQueue}</span> In Queue | <span className="text-purple-400">{playerStats.playing}</span> In Match
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Separator className="w-1.5 bg-[#111111] hover:bg-[#39d353] transition-colors relative flex items-center justify-center cursor-col-resize z-10 group border-l border-r border-neutral-800">
            <div className="absolute inset-y-0 -left-2 -right-2" />
            <GripVertical size={14} className="text-gray-600 group-hover:text-black transition-colors z-20" />
          </Separator>

          {/* RIGHT PANEL: Editor & Terminal */}
          <Panel id="ide-panel" order={2} defaultSize={65} minSize={40}>
            <Group orientation="vertical">

              {/* TOP: Code Editor */}
              <Panel id="editor-panel" order={1} defaultSize={70} minSize={30}>
                <div className="h-full flex flex-col bg-[#050505]">
                  <div className="h-12 px-4 bg-[#111111] border-b border-neutral-800 flex justify-between items-center rounded-tr-xl">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
                      <Code2 size={16} className="text-blue-400" /> config.js
                    </div>

                    <div>
                      {!isSearching ? (
                        <button
                          onClick={handleJoinQueue}
                          className="flex items-center gap-2 bg-[#39d353] text-black px-5 py-1.5 rounded-md text-xs font-bold font-mono hover:bg-white hover:scale-105 transition-all shadow-[0_0_15px_rgba(57,211,83,0.3)]"
                        >
                          <Play size={14} fill="currentColor" /> Find Match
                        </button>
                      ) : (
                        <button
                          onClick={handleCancelSearch}
                          className="flex items-center gap-2 bg-red-500/20 text-red-500 border border-red-500/50 px-5 py-1.5 rounded-md text-xs font-bold font-mono hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        >
                          Cancel Search ({formatTime(searchTime)})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 p-6 overflow-auto custom-scrollbar font-mono text-sm leading-loose">
                    <pre className="text-gray-300">
                      <code dangerouslySetInnerHTML={{
                        __html: typedCode
                          .replace(/(\/\/.*)/g, "<span class='code-comment'>$1</span>")
                          .replace(/(const|let|var)\s/g, "<span class='code-kw'>$1</span> ")
                          .replace(/(".*?")/g, "<span class='code-str'>$1</span>")
                          .replace(/([0-9]+)/g, "<span class='code-num'>$1</span>")
                          .replace(/(true|false)/g, "<span class='code-bool'>$1</span>")
                          .replace(/(player|timeLimit|tags|difficulty|strictMatch)/g, "<span class='code-var'>$1</span>")
                      }} />
                      <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1 align-middle"></span>
                    </pre>
                  </div>
                </div>
              </Panel>

              <Separator className="h-1.5 bg-[#111111] hover:bg-[#39d353] transition-colors relative flex items-center justify-center cursor-row-resize z-10 group border-t border-b border-neutral-800">
                <div className="absolute inset-x-0 -top-2 -bottom-2" />
                <GripHorizontal size={14} className="text-gray-600 group-hover:text-black transition-colors z-20" />
              </Separator>

              {/* BOTTOM: Terminal */}
              <Panel id="terminal-panel" order={2} defaultSize={30} minSize={20}>
                <div className="h-full flex flex-col bg-[#000000] rounded-br-xl">
                  <div className="h-8 px-4 bg-[#111111] border-b border-neutral-800 flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <Terminal size={12} /> Terminal Output
                  </div>
                  <div className="flex-1 p-4 overflow-auto custom-scrollbar font-mono text-xs leading-relaxed text-gray-400 flex flex-col justify-end">
                    <div className="space-y-1 mt-auto">
                      {terminalLogs.map((log, idx) => (
                        <div key={idx} className={`${log.includes('[System]') ? 'text-blue-400' :
                            log.includes('[Tip]') ? 'text-yellow-400' :
                              log.includes('[Config]') ? 'text-green-400' :
                                'text-gray-400'
                          }`}>
                          {log}
                        </div>
                      ))}
                      {isSearching && (
                        <div className="flex items-center gap-2 text-gray-500 mt-2">
                          <span className="w-2 h-2 rounded-full bg-[#39d353] animate-ping" /> Waiting for socket events...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>

            </Group>
          </Panel>

        </Group>
      </div>

      {/* PROPOSAL MODAL */}
      {proposal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] p-8 rounded-xl max-w-md w-full shadow-2xl border border-yellow-500/30">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2 font-display uppercase tracking-wider">Compromise Match</h2>
            <p className="text-sm text-gray-400 mb-6">
              We couldn't find an exact match in the queue. Do you accept these settings instead?
            </p>

            <div className="bg-[#111111] border border-neutral-800 p-4 rounded-lg mb-8 font-mono text-sm space-y-3">
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Topic</span>
                <span className="text-blue-400 font-bold">{proposal.config.topic}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Time Limit</span>
                <span className="text-green-400 font-bold">{proposal.config.timeLimit} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Difficulty</span>
                <span className="text-red-400 font-bold uppercase">{proposal.config.difficulty}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={rejectProposal}
                className="flex-1 bg-[#111111] hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs font-bold py-3 rounded-lg transition-colors"
              >
                Decline
              </button>
              <button
                onClick={acceptProposal}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-mono text-xs font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all"
              >
                Accept Match
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .code-comment { color: #4b5563; font-style: italic; }
        .code-kw { color: #60a5fa; }
        .code-str { color: #4ade80; }
        .code-num { color: #fde047; }
        .code-bool { color: #c084fc; }
        .code-var { color: #bfdbfe; }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>
    </div>
  );
}