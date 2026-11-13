// Sin "use client": así una página del servidor puede usar <Button asChild><Link/></Button>.
// Siendo componente de cliente, el hijo llegaba como referencia del servidor y
// Children.only fallaba (Reportes se caía con "React.Children.only expected...").
import type { ButtonHTMLAttributes } from "react";
import { Children, cloneElement, isValidElement } from "react";

const variants = {
  primary: "bg-brand-700 text-text-inverse shadow-sm hover:bg-brand-800 disabled:bg-app-borderStrong",
  secondary:
    "border border-app-borderStrong bg-app-surface text-text-strong shadow-sm hover:bg-app-surface-muted disabled:text-text-disabled",
  ghost: "text-text-body hover:bg-app-surface-muted hover:text-text-strong",
  danger: "bg-status-danger text-text-inverse shadow-sm hover:bg-status-dangerHover disabled:bg-status-dangerBorder",
  icon: "border border-app-border bg-app-surface text-text-body shadow-sm hover:bg-app-surface-muted hover:text-text-strong disabled:text-text-disabled",
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
  const shapeClasses =
    variant === "icon" ? "h-control w-[var(--height-control)] px-0" : "h-control px-4";
  const classes = `inline-flex items-center justify-center gap-2 rounded-control text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-app-background disabled:cursor-not-allowed ${shapeClasses} ${variants[variant]} ${className}`;

  if (asChild) {
    const child = Children.only(children);
    if (isValidElement<{ className?: string }>(child)) {
      return cloneElement(child, {
        ...props,
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
