import type { ButtonHTMLAttributes } from "react";
import { Children, cloneElement, isValidElement } from "react";

const variants = {
  primary: "bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300",
  secondary:
    "border border-slate-300 bg-white text-slate-950 hover:bg-slate-50 disabled:text-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
} as const;

type ButtonVariant = keyof typeof variants;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  asChild?: boolean;
}

export function Button({
  asChild = false,
  className = "",
  type = "button",
  variant = "primary",
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed ${variants[variant]} ${className}`;

  if (asChild) {
    const child = Children.only(children);
    if (isValidElement<{ className?: string }>(child)) {
      return cloneElement(child, {
        className: `${classes} ${child.props.className ?? ""}`,
      });
    }
  }

  return (
    <button
      type={type}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
}
