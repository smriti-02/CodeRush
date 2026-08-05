import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { socket } from '../api/socket'; 
import axiosInstance from '../api/axios';
import axios from 'axios';
import { Panel, Group, Separator } from "react-resizable-panels";
import { GripVertical, GripHorizontal } from "lucide-react";

// Restrict languages to the 4 requested by user
const ALLOWED_LANGUAGES = {
    'javascript': { id: 93, label: 'JavaScript' },
    'python': { id: 71, label: 'Python' },
    'python3': { id: 71, label: 'Python' }, // Some LeetCode schemas use python3
    'java': { id: 62, label: 'Java' },
    'cpp': { id: 54, label: 'C++' },
};

export default function Arena() {
  const { gameId } = useParams();
  
  const [timeLeft, setTimeLeft] = useState(null);
  const [opponentStatus, setOpponentStatus] = useState("Waiting for opponent...");
  
  const [questionData, setQuestionData] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(true);
  const [execResult, setExecResult] = useState(null);
  const [wrongSubmissions, setWrongSubmissions] = useState(0);

  useEffect(() => {
    const fetchArenaData = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/v1/games/arena/${gameId}`, {
            withCredentials: true
        });
        const gameData = response.data.data;
        const question = gameData.question;

        if (!question) {
            console.error("No question found in this game record:", gameData);
            alert("Match data is corrupted (no question attached).");
            return;
        }
        
        setQuestionData(question);
        
        // Find default snippet within the allowed list
        const defaultSnippet = question.codeSnippets.find(s => ALLOWED_LANGUAGES[s.langSlug]) || question.codeSnippets[0];
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
    socket.emit('playerStatusUpdate', { gameId, status: "Compiling..." });
    const currentLangId = ALLOWED_LANGUAGES[language]?.id || 62;

    try {
        const response = await axios.post('http://localhost:8000/api/v1/judge/run', {
          questionId: questionData._id,
          sourceCode: code,
          langSlug: language,
          languageId: currentLangId,
          testCases: questionData.sampleTestCase,
          sessionId: gameId
        }, { withCredentials: true });

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
    const currentLangId = ALLOWED_LANGUAGES[language]?.id || 62;

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

  if (loading) return <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center font-mono">Loading Arena...</div>;

  // Filter available languages to only the 4 requested
  const availableLanguages = questionData.codeSnippets?.filter(s => ALLOWED_LANGUAGES[s.langSlug]) || [];

  return (
    <div className="h-screen w-screen bg-[#020503] text-gray-300 overflow-hidden font-sans flex flex-col">
      {/* Top Header Placeholder (if needed, otherwise we integrate deeply) */}
      <div className="flex-none h-14 bg-[#111111] border-b border-neutral-800 flex justify-between items-center px-6">
        <h2 className="text-lg font-bold text-[#39d353] font-display tracking-wide uppercase">Match Arena</h2>
        <span className="text-xs font-mono bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-neutral-800 text-gray-400 shadow-inner">
          ID: {gameId.split('_')[1] || gameId}
        </span>
      </div>

      <div className="flex-1 overflow-hidden p-2">
        <Group orientation="horizontal" className="h-full rounded-xl overflow-hidden border border-neutral-800 bg-[#0a0a0a]">
          
          {/* LEFT COLUMN */}
          <Panel id="problem-panel" order={1} defaultSize={45} minSize={30}>
            <div className="h-full overflow-y-auto p-6 bg-[#0a0a0a] custom-scrollbar">
              
              {/* Opponent Status Card */}
              <div className="bg-[#111111] border border-neutral-800 p-4 rounded-xl mb-6 flex items-center justify-between shadow-lg">
                <div>
                  <h3 className="text-[10px] font-bold font-mono text-gray-500 uppercase tracking-widest mb-1">Opponent Status</h3>
                  <p className={`text-sm font-mono ${opponentStatus.includes('Disconnected') ? 'text-red-400' : 'text-[#39d353] animate-pulse'}`}>
                    {opponentStatus}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-[10px] font-bold font-mono text-gray-500 uppercase tracking-widest mb-1">Time Remaining</h3>
                  <div className={`text-xl font-mono font-bold ${timeLeft <= 60 ? 'text-red-500 animate-pulse' : 'text-gray-200'}`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              {/* Question Rendering */}
              <div className="prose prose-invert prose-pre:bg-[#111111] prose-pre:border prose-pre:border-neutral-800 max-w-none flex-grow">
                <h1 className="text-3xl font-display font-bold text-white mb-4 leading-tight">{questionData.title}</h1>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  <span className={`px-3 py-1 rounded-full border text-[11px] font-bold uppercase font-mono ${
                      questionData.difficulty === 'Easy' ? 'bg-[#39d353]/10 border-[#39d353]/30 text-[#39d353]' : 
                      questionData.difficulty === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 
                      'bg-red-500/10 border-red-500/30 text-red-500'
                  }`}>
                    {questionData.difficulty}
                  </span>
                  {questionData.topicTags?.map(tag => (
                      <span key={tag.slug} className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-full text-[11px] font-bold font-mono uppercase">
                          {tag.name}
                      </span>
                  ))}
                </div>
                
                <div className="text-gray-300 leading-relaxed font-body" dangerouslySetInnerHTML={{ __html: questionData.content }} />
              </div>
            </div>
          </Panel>

          {/* Vertical Resize Handle */}
          <Separator className="w-1.5 bg-[#111111] hover:bg-[#39d353] transition-colors relative flex items-center justify-center cursor-col-resize z-10 group border-l border-r border-neutral-800">
             <div className="absolute inset-y-0 -left-2 -right-2" />
             <GripVertical size={14} className="text-gray-600 group-hover:text-black transition-colors z-20" />
          </Separator>

          {/* RIGHT COLUMN */}
          <Panel id="editor-panel" order={2} defaultSize={55} minSize={30}>
            <Group orientation="vertical">
              
              {/* TOP: Editor */}
              <Panel id="editor" order={1} defaultSize={65} minSize={20}>
                <div className="h-full flex flex-col bg-[#0a0a0a]">
                  
                  {/* Editor Header */}
                  <div className="h-12 px-4 bg-[#111111] border-b border-neutral-800 flex justify-between items-center rounded-tr-xl">
                    <select 
                      value={language}
                      onChange={(e) => {
                          const newLang = e.target.value;
                          setLanguage(newLang);
                          const snippet = questionData.codeSnippets.find(s => s.langSlug === newLang);
                          if (snippet) setCode(snippet.code);
                      }}
                      className="bg-[#0a0a0a] border border-neutral-800 text-gray-300 text-xs font-mono font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#39d353] transition-colors cursor-pointer outline-none"
                    >
                      {availableLanguages.map(s => (
                          <option key={s.langSlug} value={s.langSlug}>{ALLOWED_LANGUAGES[s.langSlug].label}</option>
                      ))}
                    </select>
                    
                    <div className="flex items-center gap-3">
                      <button 
                          onClick={handleRunCode} 
                          className="bg-[#1a1a1a] border border-neutral-700 text-gray-300 px-4 py-1.5 rounded-lg text-xs font-bold font-mono hover:bg-[#222] hover:text-white hover:border-neutral-500 transition-all"
                      >
                          Run
                      </button>
                      <button 
                          onClick={handleSubmitCode} 
                          className="bg-[#39d353] text-black px-4 py-1.5 rounded-lg text-xs font-bold font-mono hover:bg-white hover:scale-105 transition-all shadow-[0_0_15px_rgba(57,211,83,0.3)]"
                      >
                        Submit
                      </button>
                    </div>
                  </div>

                  {/* Monaco Editor */}
                  <div className="flex-1 bg-transparent">
                    <Editor
                      height="100%"
                      language={language === 'python3' ? 'python' : language}
                      theme="vs-dark"
                      value={code}
                      onChange={(val) => {
                          setCode(val);
                          socket.emit('playerStatusUpdate', { gameId, status: "Typing..." });
                      }}
                      options={{ 
                        minimap: { enabled: false }, 
                        fontSize: 14, 
                        fontFamily: "JetBrains Mono, monospace",
                        wordWrap: "on", 
                        padding: { top: 16 },
                        scrollBeyondLastLine: false,
                        overviewRulerLanes: 0,
                        hideCursorInOverviewRuler: true,
                        renderLineHighlight: "all",
                        cursorBlinking: "smooth"
                      }}
                    />
                  </div>
                </div>
              </Panel>

              {/* Horizontal Resize Handle */}
              <Separator className="h-1.5 bg-[#111111] hover:bg-[#39d353] transition-colors relative flex items-center justify-center cursor-row-resize z-10 group border-t border-b border-neutral-800">
                <div className="absolute inset-x-0 -top-2 -bottom-2" />
                <GripHorizontal size={14} className="text-gray-600 group-hover:text-black transition-colors z-20" />
              </Separator>

              {/* BOTTOM: Console */}
              <Panel id="console" order={2} defaultSize={35} minSize={20}>
                <div className="h-full p-6 bg-[#111111] overflow-auto rounded-br-xl custom-scrollbar">
                  <h3 className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest mb-4">Execution Result</h3>
                  {!execResult && <p className="text-sm font-mono text-neutral-600 italic">No execution yet. Run your code to see outputs.</p>}
                  {execResult && (
                    <div className="text-sm font-mono text-gray-300">
                      <div className="mb-4">
                        <strong className="text-gray-500 block mb-1 text-[10px] uppercase tracking-wider">Status</strong> 
                        <span className={`px-2 py-1 rounded bg-black/50 border font-bold ${execResult.status === 'Accepted' ? 'border-[#39d353]/30 text-[#39d353]' : 'border-red-500/30 text-red-500'}`}>
                          {execResult.status}
                        </span>
                      </div>
                      
                      {execResult.stdout && (
                        <div className="mb-4">
                          <strong className="text-gray-500 block mb-1 text-[10px] uppercase tracking-wider">Stdout</strong>
                          <pre className="whitespace-pre-wrap bg-[#0a0a0a] border border-neutral-800 p-3 rounded-lg text-gray-300">{execResult.stdout}</pre>
                        </div>
                      )}
                      
                      {execResult.stderr && (
                        <div className="mb-4">
                          <strong className="text-gray-500 block mb-1 text-[10px] uppercase tracking-wider">Stderr</strong>
                          <pre className="whitespace-pre-wrap bg-[#0a0a0a] border border-red-900/30 p-3 rounded-lg text-red-400">{execResult.stderr}</pre>
                        </div>
                      )}
                      
                      {execResult.expected_output && (
                        <div className="mb-4">
                          <strong className="text-gray-500 block mb-1 text-[10px] uppercase tracking-wider">Expected</strong>
                          <pre className="whitespace-pre-wrap bg-[#0a0a0a] border border-neutral-800 p-3 rounded-lg text-green-400">{execResult.expected_output}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Panel>

            </Group>
          </Panel>

        </Group>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a0a0a;
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