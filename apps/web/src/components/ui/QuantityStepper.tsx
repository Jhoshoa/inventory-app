import { Minus, Plus } from "lucide-react";
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
        className="h-8 w-8 rounded-r-none px-0"
        variant="ghost"
        onClick={onDecrement}
        aria-label="Disminuir cantidad"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </Button>
      <span className="min-w-10 text-center text-sm font-medium">{value}</span>
      <Button
        className="h-8 w-8 rounded-l-none px-0"
        variant="ghost"
        onClick={onIncrement}
        disabled={incrementDisabled}
        aria-label="Aumentar cantidad"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
