import type { HTMLAttributes, TableHTMLAttributes } from "react";

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  density?: "compact" | "comfortable";
  wrapperClassName?: string;
}

export function Table({
  className = "",
  density = "comfortable",
  wrapperClassName = "",
  ...props
}: TableProps) {
  const densityClasses = {
    compact: "text-xs sm:text-sm",
    comfortable: "text-sm",
  }[density];

  return (
    <div className={`min-w-0 overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-panel ${wrapperClassName}`}>
      <div className="w-full overflow-x-auto">
        <table className={`min-w-full border-separate border-spacing-0 text-left text-text-body ${densityClasses} ${className}`} {...props} />
      </div>
    </div>
  );
}

export function TableEmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td className="px-4 py-8 text-center text-sm text-text-muted" colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}

type TableAlign = "left" | "center" | "right";

type TableTone = "default" | "muted" | "warning" | "danger" | "success";

const alignClasses: Record<TableAlign, string> = {
  center: "text-center",
  left: "text-left",
  right: "text-right tabular-nums",
};

const rowToneClasses: Record<TableTone, string> = {
  danger: "bg-status-dangerBg/40 hover:bg-status-dangerBg/70",
  default: "hover:bg-app-surface-muted",
  muted: "bg-app-surface-muted/50 text-text-muted hover:bg-app-surface-muted",
  success: "bg-status-successBg/40 hover:bg-status-successBg/70",
  warning: "bg-status-warningBg/45 hover:bg-status-warningBg/70",
};

function tablePadding(density: "compact" | "comfortable") {
  return density === "compact" ? "px-3 py-2" : "px-4 py-3";
}

export function TableRow({
  className = "",
  tone = "default",
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { tone?: TableTone }) {
  return (
    <tr
      className={`border-t border-app-border transition-colors ${rowToneClasses[tone]} ${className}`}
      {...props}
    />
  );
}

export function TableCell({
  align = "left",
  className = "",
  density = "comfortable",
  ...props
}: HTMLAttributes<HTMLTableCellElement> & {
  align?: TableAlign;
  density?: "compact" | "comfortable";
}) {
  return (
    <td
      className={`border-t border-app-border align-middle ${tablePadding(density)} ${alignClasses[align]} ${className}`}
      {...props}
    />
  );
}

export function TableHeaderCell({
  align = "left",
  className = "",
  density = "comfortable",
  ...props
}: HTMLAttributes<HTMLTableCellElement> & {
  align?: TableAlign;
  density?: "compact" | "comfortable";
}) {
  return (
    <th
      className={`sticky top-0 z-10 border-b border-app-border bg-app-surface-muted align-middle text-xs font-semibold uppercase text-text-muted ${tablePadding(density)} ${alignClasses[align]} ${className}`}
      {...props}
    />
  );
}

export function TableActionGroup({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex min-w-max flex-wrap items-center justify-end gap-1.5 ${className}`}
      {...props}
    />
  );
}

export function TableText({
  className = "",
  muted = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { muted?: boolean }) {
  return (
    <div
      className={`max-w-[18rem] truncate ${muted ? "text-xs text-text-muted" : ""} ${className}`}
      {...props}
    />
  );
}
