export function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-semibold text-text-strong" : "text-text-muted"}>
        {label}
      </span>
      <span className={strong ? "font-semibold text-text-strong" : "text-text-body"}>
        {value}
      </span>
    </div>
  );
}
