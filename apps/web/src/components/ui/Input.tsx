import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className = "", error = false, ...props }: InputProps) {
  return (
    <input
      className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
        error ? "border-red-500" : "border-slate-300"
      } ${className}`}
      {...props}
    />
  );
}
