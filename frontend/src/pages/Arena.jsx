// frontend/src/pages/Arena.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { socket } from '../api/socket'; 
import axiosInstance from '../api/axios'; // Ensure your axios instance is correctly configured

export default function Arena() {
  const { gameId } = useParams();
  
  const [timeLeft, setTimeLeft] = useState(null);
  const [opponentStatus, setOpponentStatus] = useState("Waiting for opponent...");
  
  // Dynamic State
  const [questionData, setQuestionData] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Dynamic Game Data from Database
    const fetchArenaData = async () => {
      try {
        // Adjust this endpoint if your routes are setup differently (e.g., /api/games/)
        const response = await axiosInstance.get(`/games/${gameId}`); 
        const gameData = response.data.data;

        // Pull the first question from the populated questions array
        const question = gameData.questions && gameData.questions[0]; 

        if (!question) {
            console.error("No question found in this game record:", gameData);
            alert("Match data is corrupted (no question attached).");
            return;
        }
        
        setQuestionData(question);
        
        // Find default snippet (fallback to first available if JS isn't found)
        const defaultSnippet = question.codeSnippets.find(s => s.langSlug === 'javascript') || question.codeSnippets[0];
        if (defaultSnippet) {
          setCode(defaultSnippet.code);
          setLanguage(defaultSnippet.langSlug);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Failed to load arena data:", error);
        alert("Error loading match data. Check console.");
      }
    };
    
    fetchArenaData();

    // 2. Socket Listeners
    socket.emit('rejoinMatch', { gameId });
    socket.on('timerUpdate', ({ timeLeft }) => setTimeLeft(timeLeft));
    socket.on('opponentStatusUpdate', ({ status }) => setOpponentStatus(status));
    socket.on('matchEnded', ({ reason }) => alert(`Match Ended! Reason: ${reason}`));

    return () => {
      socket.off('timerUpdate');
      socket.off('opponentStatusUpdate');
      socket.off('matchEnded');
    };
  }, [gameId]);

  const formatTime = (seconds) => {
    if (seconds === null) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">Loading Arena...</div>;

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-300 flex overflow-hidden">
      
      {/* LEFT COLUMN */}
      <div className="w-1/2 p-6 border-r border-gray-800 overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
            <h2 className="text-xl font-bold text-white tracking-wide">Match Arena</h2>
            <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-gray-400">ID: {gameId.split('_')[1] || gameId}</span>
        </div>

        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-lg mb-6 flex items-center justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Opponent Status</h3>
            <p className={`text-sm font-mono ${opponentStatus.includes('Disconnected') ? 'text-red-400' : 'text-green-400 animate-pulse'}`}>
              {opponentStatus}
            </p>
          </div>
          <div className={`text-2xl font-mono font-bold ${timeLeft <= 60 ? 'text-red-500 animate-pulse' : 'text-red-400'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* ========================================== */}
        {/* DYNAMIC QUESTION RENDERING INSTEAD OF TWO SUM */}
        {/* ========================================== */}
        <div className="prose prose-invert max-w-none flex-grow">
          <h1 className="text-2xl font-bold text-white mb-2">{questionData.title}</h1>
          <div className="flex gap-2 mb-6">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                questionData.difficulty === 'Easy' ? 'bg-green-900/30 text-green-400' : 
                questionData.difficulty === 'Medium' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'
            }`}>
              {questionData.difficulty}
            </span>
            {questionData.topicTags?.map(tag => (
                <span key={tag.slug} className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs font-semibold">
                    {tag.name}
                </span>
            ))}
          </div>
          
          {/* Renders the HTML block stored in MongoDB */}
          <div className="text-gray-300 mb-4" dangerouslySetInnerHTML={{ __html: questionData.content }} />
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="w-1/2 flex flex-col bg-[#0d1117]">
        <div className="h-14 px-4 bg-[#161b22] border-b border-gray-800 flex justify-between items-center">
          <select 
            value={language}
            onChange={(e) => {
                const newLang = e.target.value;
                setLanguage(newLang);
                const snippet = questionData.codeSnippets.find(s => s.langSlug === newLang);
                if (snippet) setCode(snippet.code);
            }}
            className="bg-[#0d1117] border border-gray-700 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            {questionData.codeSnippets?.map(s => (
                <option key={s.langSlug} value={s.langSlug}>{s.lang}</option>
            ))}
          </select>
          
          <div className="space-x-3">
            <button onClick={() => socket.emit('playerStatusUpdate', { gameId, status: "Compiling..." })} className="bg-gray-700 text-gray-200 px-5 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-600 transition-colors">
              Run
            </button>
            <button onClick={() => socket.emit('playerStatusUpdate', { gameId, status: "Submitted code!" })} className="bg-green-600/90 text-white px-5 py-1.5 rounded-md text-sm font-semibold hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20">
              Submit
            </button>
          </div>
        </div>

        <div className="flex-grow pt-2">
          <Editor
            height="100%"
            language={language === 'python3' ? 'python' : language}
            theme="vs-dark"
            value={code}
            onChange={(val) => {
                setCode(val);
                socket.emit('playerStatusUpdate', { gameId, status: "Typing..." });
            }}
            options={{ minimap: { enabled: false }, fontSize: 15, wordWrap: "on", padding: { top: 16 } }}
          />
        </div>
      </div>
    </div>
  );
}