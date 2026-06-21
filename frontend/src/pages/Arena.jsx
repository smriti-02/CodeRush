import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';

export default function Arena() {
  const { gameId } = useParams();

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-300 flex overflow-hidden">
      
      {/* LEFT COLUMN: Problem & Status */}
      <div className="w-1/2 p-6 border-r border-gray-800 overflow-y-auto flex flex-col">
        
        {/* Match Header */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
            <h2 className="text-xl font-bold text-white tracking-wide">Match Arena</h2>
            <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-gray-400">ID: {gameId.split('_')[1]}</span>
        </div>

        {/* Live Opponent Status Indicator */}
        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-lg mb-6 flex items-center justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Opponent Status</h3>
            <p className="text-green-400 font-mono text-sm animate-pulse">Waiting for updates...</p>
          </div>
          {/* Timer Placeholder */}
          <div className="text-2xl font-mono text-red-400 font-bold">10:00</div>
        </div>

        {/* Problem Statement Placeholder */}
        <div className="prose prose-invert max-w-none flex-grow">
          <h1 className="text-2xl font-bold text-white mb-2">1. Two Sum</h1>
          <div className="flex gap-2 mb-6">
            <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs font-semibold">Easy</span>
          </div>
          <p className="text-gray-300 mb-4">
            Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.
          </p>
          <p className="text-gray-300 mb-4">
            You may assume that each input would have exactly one solution, and you may not use the same element twice.
          </p>
          <div className="bg-[#161b22] p-4 rounded-lg border border-gray-800 font-mono text-sm mb-4">
            <span className="text-gray-500">Input:</span> nums = [2,7,11,15], target = 9<br/>
            <span className="text-gray-500">Output:</span> [0,1]
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Code Editor */}
      <div className="w-1/2 flex flex-col bg-[#0d1117]">
        
        {/* Editor Toolbar */}
        <div className="h-14 px-4 bg-[#161b22] border-b border-gray-800 flex justify-between items-center">
          <select className="bg-[#0d1117] border border-gray-700 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-blue-500">
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="python">Python 3</option>
            <option value="cpp">C++</option>
          </select>
          
          <div className="space-x-3">
            {/* Run & Submit Buttons */}
            <button className="bg-gray-700 text-gray-200 px-5 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-600 transition-colors">
              Run
            </button>
            <button className="bg-green-600/90 text-white px-5 py-1.5 rounded-md text-sm font-semibold hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20">
              Submit
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-grow pt-2">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            defaultValue={`// Write your solution here\nfunction twoSum(nums, target) {\n    \n}`}
            options={{
              minimap: { enabled: false },
              fontSize: 15,
              wordWrap: "on",
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
            }}
          />
        </div>
      </div>

    </div>
  );
}