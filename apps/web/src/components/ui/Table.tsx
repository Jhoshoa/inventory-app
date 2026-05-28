import type { HTMLAttributes, TableHTMLAttributes } from "react";

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
}

export function Table({
  className = "",
  wrapperClassName = "",
  ...props
}: TableProps) {
  return (
    <div className={`overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-panel ${wrapperClassName}`}>
      <div className="w-full overflow-x-auto">
        <table className={`min-w-full text-left text-sm text-text-body ${className}`} {...props} />
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

export function TableCell({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={`border-t border-app-border px-4 py-3 align-middle ${className}`} {...props} />;
}

export function TableHeaderCell({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`bg-app-surface-muted px-4 py-3 text-xs font-semibold uppercase text-text-muted ${className}`}
      {...props}
    />
  );
}
