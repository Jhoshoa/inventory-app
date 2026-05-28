import { Children, cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";

export function Tooltip({
  children,
  content,
}: {
  children: ReactElement<{ "aria-describedby"?: string }>;
  content: ReactNode;
}) {
  const id = useId();
  const child = Children.only(children);

  if (!isValidElement<{ "aria-describedby"?: string }>(child)) {
    return children;
  }

  return (
    <span className="group relative inline-flex">
      {cloneElement(child, {
        "aria-describedby": child.props["aria-describedby"] ?? id,
      })}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-text-strong px-2 py-1 text-xs font-medium text-text-inverse shadow-floating group-focus-within:block group-hover:block"
      >
        {content}
      </span>
    </span>
  );
}
