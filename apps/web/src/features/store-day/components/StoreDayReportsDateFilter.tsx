import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function StoreDayReportsDateFilter({
  fromDate,
  toDate,
}: {
  fromDate?: string;
  toDate?: string;
}) {
  return (
    <form
      action="/dashboard/reports/store-days"
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_auto_auto]"
    >
      <DateInput label="Desde" name="from_date" defaultValue={fromDate} />
      <DateInput label="Hasta" name="to_date" defaultValue={toDate} />
      <div className="flex items-end">
        <Button className="w-full" type="submit" variant="primary">
          Filtrar
        </Button>
      </div>
      <div className="flex items-end">
        <Button className="w-full" asChild variant="secondary">
          <Link href="/dashboard/reports/store-days">Limpiar</Link>
        </Button>
      </div>
    </form>
  );
}

function DateInput({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
        {label}
      </span>
      <span className="relative block">
        <CalendarDays
          className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"
          aria-hidden
        />
        <Input
          className="pl-9"
          type="date"
          name={name}
          defaultValue={defaultValue}
        />
      </span>
    </label>
  );
}
