import React from 'react';

export default function RadioGroup({ label, name, value, checked, onChange }) {
  return (
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        className="peer hidden"
        checked={checked}
        onChange={onChange}
      />
      <div className="w-4 h-4 border-2 border-gray-400 rounded-full flex items-center justify-center transition-colors duration-200 peer-checked:border-slate-600 peer-checked:bg-slate-500" />
      <span className="text-gray-600 peer-checked:text-slate-800 text-sm font-medium peer-checked:font-semibold">
        {label}
      </span>
    </label>
  );
}