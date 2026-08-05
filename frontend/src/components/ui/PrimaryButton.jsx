import React from 'react';

const PrimaryButton = ({ text, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-md shadow-lg transition-transform transform hover:-translate-y-1"
    >
      {text}
    </button>
  );
};

export default PrimaryButton;