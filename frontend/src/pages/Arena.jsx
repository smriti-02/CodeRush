import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { socket } from '../api/socket'; // <-- Import the shared socket

export default function Arena() {
  const { gameId } = useParams();
  
  const [timeLeft, setTimeLeft] = useState(null);
  const [opponentStatus, setOpponentStatus] = useState("Waiting for updates...");
  const [code, setCode] = useState(`// Write your solution here\nfunction twoSum(nums, target) {\n    \n}`);

  useEffect(() => {
    // Tell the backend we successfully arrived in the arena room
    socket.emit('rejoinMatch', { gameId });

    socket.on('timerUpdate', ({ timeLeft }) => {
      setTimeLeft(timeLeft);
    });

    socket.on('opponentStatusUpdate', ({ status }) => {
      setOpponentStatus(status);
    });

    socket.on('matchEnded', ({ reason }) => {
        alert(`Match Ended! Reason: ${reason}`);
    });

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

  // Safe ID parsing fallback in case ID structure changes
  const displayId = gameId?.includes('_') ? gameId.split('_')[1] : gameId;

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-300 flex overflow-hidden">
      
      {/* LEFT COLUMN: Problem & Status */}
      <div className="w-1/2 p-6 border-r border-gray-800 overflow-y-auto flex flex-col">
        
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
            <h2 className="text-xl font-bold text-white tracking-wide">Match Arena</h2>
            <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-gray-400">ID: {displayId}</span>
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

        {/* Dynamic fetching logic will replace this static text in Phase 2 */}
        <div className="prose prose-invert max-w-none flex-grow">
          <h1 className="text-2xl font-bold text-white mb-2">1. Two Sum</h1>
          <div className="flex gap-2 mb-6">
            <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs font-semibold">Easy</span>
          </div>
          <p className="text-gray-300 mb-4">
            Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.
          </p>
          <div className="bg-[#161b22] p-4 rounded-lg border border-gray-800 font-mono text-sm mb-4">
            <span className="text-gray-500">Input:</span> nums = [2,7,11,15], target = 9<br/>
            <span className="text-gray-500">Output:</span> [0,1]
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Code Editor */}
      <div className="w-1/2 flex flex-col bg-[#0d1117]">
        <div className="h-14 px-4 bg-[#161b22] border-b border-gray-800 flex justify-between items-center">
          <select className="bg-[#0d1117] border border-gray-700 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-blue-500">
            <option value="javascript">JavaScript (Node.js)</option>
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
            defaultLanguage="javascript"
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