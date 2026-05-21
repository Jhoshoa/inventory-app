import { Button } from "./Button";

export function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  incrementDisabled = false,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  incrementDisabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-slate-300 bg-white">
      <Button
        className="h-8 w-8 rounded-r-none border-r border-slate-300 bg-slate-50 px-0 text-lg font-semibold leading-none text-slate-950 hover:bg-slate-100 disabled:text-slate-300"
        variant="ghost"
        onClick={onDecrement}
        aria-label="Disminuir cantidad"
      >
        <span aria-hidden="true">-</span>
      </Button>
      <span className="min-w-10 text-center text-sm font-medium text-slate-950">{value}</span>
      <Button
        className="h-8 w-8 rounded-l-none border-l border-slate-300 bg-slate-50 px-0 text-lg font-semibold leading-none text-slate-950 hover:bg-slate-100 disabled:text-slate-300"
        variant="ghost"
        onClick={onIncrement}
        disabled={incrementDisabled}
        aria-label="Aumentar cantidad"
      >
        <span aria-hidden="true">+</span>
      </Button>
    </div>
  );
}
