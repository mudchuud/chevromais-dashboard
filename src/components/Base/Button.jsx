function forceImportant(classString = "") {
  return classString
    .split(" ")
    .map((cls) => (cls.trim() ? `!${cls.trim()}` : ""))
    .join(" ");
}

export default function Button({ label, name, onClick, type = "button",disabled , className = "", ...props }) {
  const baseClasses =
    "w-full border border-slate-600 bg-slate-500 p-3 text-xs text-white font-medium rounded-lg cursor-pointer uppercase col-span-2 hover:bg-slate-700 transition-all duration-200";
  const linkClasses =
    "text-blue-600 underline p-0 bg-transparent border-none hover:text-blue-800";

  const defaultClasses = type === "link" ? linkClasses : baseClasses;
  const forcedUserClasses = forceImportant(className);
  const finalClasses = `${defaultClasses} ${forcedUserClasses}`;

  return (
    <button
      name={name}
      id={name}
      onClick={onClick}
      disabled={disabled}
      className={finalClasses}
      {...props}
    >
      {label}
    </button>
  );
}
