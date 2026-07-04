import React, { useState, useEffect } from 'react';

const AVAILABLE_TOPICS = [
  "Arrays", "Strings", "Math", "HashMaps", 
  "Two Pointers", "Sliding Window", "DP", "Linked List"
];

const TIME_LIMITS = [10, 20, 30, 45, 60];

const MatchmakingUI = ({ onJoinQueue }) => {
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [timeLimit, setTimeLimit] = useState(20);
  const [difficulty, setDifficulty] = useState('medium');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  // Timer logic for waiting in queue
  useEffect(() => {
    let interval;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime((prev) => prev + 1);
      }, 1000);
    } else {
      setSearchTime(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleTopic = (topic) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic) 
        : [...prev, topic]
    );
  };

  const handleFindMatch = () => {
    if (selectedTopics.length === 0) {
      alert("Please select at least one topic.");
      return;
    }
    setIsSearching(true);
    
    // Pass the exact structure your new backend expects
    if (onJoinQueue) {
      onJoinQueue({ 
        topics: selectedTopics, 
        timeLimit: timeLimit, 
        difficulty: difficulty 
      });
    }
  };

  const handleCancel = () => {
    setIsSearching(false);
    // You should also emit a cancel event to the backend here if you add one later
  };

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl w-full max-w-lg mx-auto text-white shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-100">Arena Setup</h2>

      {!isSearching ? (
        <div className="space-y-6">
          
          {/* 1. Topics Selection (Multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Topics (Any match)
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition-all ${
                    selectedTopics.includes(topic)
                      ? 'bg-blue-600 text-white border border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Time Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Time Limit (Minutes)
            </label>
            <div className="flex gap-2">
              {TIME_LIMITS.map((time) => (
                <button
                  key={time}
                  onClick={() => setTimeLimit(time)}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    timeLimit === time
                      ? 'bg-purple-600 text-white border border-purple-500'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  {time}m
                </button>
              ))}
            </div>
          </div>

          {/* 3. Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Difficulty
            </label>
            <div className="flex gap-3">
              {['easy', 'medium', 'hard'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 capitalize py-2 rounded-lg font-medium transition-all ${
                    difficulty === level
                      ? level === 'easy'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : level === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                        : 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-gray-800 text-gray-500 border border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleFindMatch}
            disabled={selectedTopics.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg mt-4 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          >
            Find Match
          </button>
        </div>
      ) : (
        /* Searching State */
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 bg-blue-500/20 rounded-full animate-ping"></div>
            <div className="absolute w-16 h-16 bg-blue-500/40 rounded-full animate-pulse"></div>
            <div className="z-10 bg-blue-600 rounded-full p-4">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-100 mb-2">Searching for opponent...</h3>
            <div className="flex flex-wrap justify-center gap-1 mb-2 max-w-[250px]">
              {selectedTopics.map(t => (
                <span key={t} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">{t}</span>
              ))}
            </div>
            <p className="text-gray-400 text-sm mt-2">
              {timeLimit} MINS • {difficulty.toUpperCase()}
            </p>
            <div className="mt-4 font-mono text-2xl text-blue-400">
              {formatTime(searchTime)}
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="w-full bg-gray-800 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-gray-700 hover:border-red-500/50 font-bold py-2.5 rounded-lg transition-all"
          >
            Cancel Search
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchmakingUI;