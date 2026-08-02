// frontend/src/pages/Arena.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { socket } from '../api/socket'; 
import axiosInstance from '../api/axios'; // Ensure your axios instance is correctly configured
import axios from 'axios';
const LANGUAGE_IDS = {
    'javascript': 93, // Node.js
    'python': 71,     // Python 3
    'python3': 71, 
    'java': 62,       // Java (OpenJDK)
    'cpp': 54,        // C++ (GCC)
    'c': 50,          // C (GCC)
    'csharp': 51,     // C#
    'ruby': 72,       // Ruby
    'golang': 60,     // Go
    'rust': 73        // Rust
};

export default function Arena() {
  const { gameId } = useParams();
  
  const [timeLeft, setTimeLeft] = useState(null);
  const [opponentStatus, setOpponentStatus] = useState("Waiting for opponent...");
  
  // Dynamic State
  const [questionData, setQuestionData] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(true);
  const [output, setOutput] = useState("");
  const [execResult, setExecResult] = useState(null);
  const [wrongSubmissions, setWrongSubmissions] = useState(0);

  useEffect(() => {
    // 1. Fetch Dynamic Game Data from Database
    const fetchArenaData = async () => {
      try {
        // Adjust this endpoint if your routes are setup differently (e.g., /api/games/)
        const response = await axios.get(`http://localhost:8000/api/v1/games/arena/${gameId}`, {
            withCredentials: true
        });
        const gameData = response.data.data;

        // Pull the first question from the populated questions array
       const question = gameData.question;

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
  const handleRunCode = async () => {
    // 1. Tell the socket we are compiling
    socket.emit('playerStatusUpdate', { gameId, status: "Compiling..." });
    const currentLangId = LANGUAGE_IDS[language] || 62;

    console.log("SENDING PAYLOAD:", {
        questionId: questionData._id,
        sourceCode: code,
        langSlug: language,
        languageId: currentLangId,
        testCases: questionData.sampleTestCase
    });
    try {
        // 2. Actually send the code to your backend execution route
        const response = await axios.post('http://localhost:8000/api/v1/judge/run', {
          questionId: questionData._id,
          sourceCode: code,
          langSlug: language,
          languageId: currentLangId,
          testCases: questionData.sampleTestCase,
          sessionId: gameId
        }, { withCredentials: true });

        // 3. Log the output and reset status
        console.log("Execution Result:", response.data);
        // Backend wraps the result in ApiResponse -> response.data.data
        const result = response.data?.data;
        setExecResult(result || null);
        socket.emit('playerStatusUpdate', { gameId, status: "Idle" });

    } catch (error) {
        console.error("Execution crashed:", error);
        setExecResult({ status: 'Error', stdout: '', stderr: error.response?.data?.message || error.message || 'Error executing code' });
        socket.emit('playerStatusUpdate', { gameId, status: "Error" });
    }
  };
  const handleSubmitCode = async () => {
    socket.emit('playerStatusUpdate', { gameId, status: "Submitting..." });
    const currentLangId = LANGUAGE_IDS[language] || 62;

    try {
        const response = await axios.post('http://localhost:8000/api/v1/judge/submit', {
          questionId: questionData._id,
          sourceCode: code,
          langSlug: language,
          languageId: currentLangId,
          sessionId: gameId,
          wrongSubmissions,
          userComplexity: 'O(n)' 
        }, { withCredentials: true });

        const data = response.data?.data;
        const result = data?.result;
        const eloData = data?.eloData;
        
        setExecResult(result || null);
        
        if (result?.status === "Accepted") {
            socket.emit('playerStatusUpdate', { gameId, status: "Finished!" });
            alert(`Match Won! Elo Change: ${eloData?.netEloChange > 0 ? '+' : ''}${eloData?.netEloChange}. New Elo: ${eloData?.newElo}`);
        } else {
            setWrongSubmissions(prev => prev + 1);
            socket.emit('playerStatusUpdate', { gameId, status: "Wrong Answer" });
        }
    } catch (error) {
        console.error("Submission crashed:", error);
        setExecResult({ status: 'Error', stdout: '', stderr: error.response?.data?.message || error.message || 'Error executing code' });
        socket.emit('playerStatusUpdate', { gameId, status: "Error" });
    }
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
            <button 
                onClick={handleRunCode} 
                className="bg-gray-700 text-gray-200 px-5 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-600 transition-colors"
            >
                Run
            </button>
            <button onClick={handleSubmitCode} className="bg-green-600/90 text-white px-5 py-1.5 rounded-md text-sm font-semibold hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20">
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
        <div className="h-48 p-4 bg-[#0b0f13] border-t border-gray-800 text-sm overflow-auto">
          <h3 className="text-sm font-semibold text-white mb-2">Execution Result</h3>
          {!execResult && <p className="text-gray-500">No execution yet.</p>}
          {execResult && (
            <div className="text-gray-300">
              <div className="mb-2"><strong>Status:</strong> <span className="font-mono">{execResult.status}</span></div>
              <div className="mb-2"><strong>Stdout:</strong>
                <pre className="whitespace-pre-wrap bg-[#071018] p-2 rounded mt-1">{execResult.stdout || ''}</pre>
              </div>
              <div className="mb-2"><strong>Stderr:</strong>
                <pre className="whitespace-pre-wrap bg-[#071018] p-2 rounded mt-1 text-red-400">{execResult.stderr || ''}</pre>
              </div>
              {execResult.expected_output && (
                <div className="text-gray-400"><strong>Expected:</strong>
                  <pre className="whitespace-pre-wrap bg-[#071018] p-2 rounded mt-1">{execResult.expected_output}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}