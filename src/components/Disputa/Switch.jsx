//Switch.jsx
export default function ToggleSwitch({ checked, onChange, ...props }) {
  return (
    <label className="relative inline-block w-8 h-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        {...props}
        className="peer sr-only"
      />
      <div className="cursor-pointer peer-checked:bg-slate-800 bg-slate-400 w-full h-full rounded-full transition-colors duration-300"></div>
      <div className="cursor-pointer absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-300 peer-checked:translate-x-4"></div>
    </label>
  );
}
