import React from 'react';

const SelectField = ({ label, value, options, onChange }) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-300 mb-2">{label}</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#161b22] border border-gray-700 rounded-md p-3 text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectField;