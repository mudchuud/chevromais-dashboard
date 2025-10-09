import React from "react";

const Input = React.forwardRef(({ label, type = "text", ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-medium text-gray-600">{label}</label>
      )}
      <input
        ref={ref}
        type={type}
        className={`w-full border border-black/20 p-1 px-2 bg-slate-100 rounded-md font-semibold text-xl disabled:bg-slate-300 disabled:text-slate-500 `}
        {...props}
      />
    </div>
  );
});

export default Input;
