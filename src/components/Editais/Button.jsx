// Button.jsx
export default function Button({ label, name, onClick }) {
  return (
    <button
      name={name}
      id={name}
      onClick={onClick}  // Aqui estamos conectando o onClick
      className="w-full border border-slate-600 bg-slate-500 p-3 text-xs text-white font-medium rounded-lg cursor-pointer uppercase col-span-2 hover:bg-slate-700 transition-all duration-200"
    >
      {label}
    </button>
  );
}
