import React from 'react';

const DifficultySelector = ({ selected, onSelect }) => {
  const levels = ['Easy', 'Medium', 'Hard'];

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-300 mb-2">Difficulty</label>
      <div className="grid grid-cols-3 gap-3">
        {levels.map((lvl) => (
          <button
            key={lvl}
            onClick={() => onSelect(lvl)}
            className={`py-2 rounded-md font-medium transition-all ${
              selected === lvl 
                ? 'bg-blue-600 text-white border-transparent shadow-lg shadow-blue-500/30' 
                : 'bg-[#161b22] border border-gray-700 text-gray-400 hover:bg-gray-800'
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DifficultySelector;