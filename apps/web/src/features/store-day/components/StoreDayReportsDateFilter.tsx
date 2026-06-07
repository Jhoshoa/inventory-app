import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { ResponsiveToolbar } from "@/components/layout/ResponsiveToolbar";
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
      className=""
    >
      <ResponsiveToolbar className="md:grid md:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_auto_auto]">
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
      </ResponsiveToolbar>
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
      <span className="mb-1 block text-xs font-medium uppercase text-text-muted">
        {label}
      </span>
      <span className="relative block">
        <CalendarDays
          className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted"
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
