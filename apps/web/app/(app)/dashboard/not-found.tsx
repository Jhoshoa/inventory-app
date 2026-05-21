import { ErrorState } from "@/components/ui/ErrorState";

export default function DashboardNotFound() {
  return (
    <ErrorState
      title="Seccion no encontrada"
      description="No encontramos esta vista dentro del dashboard."
      actionHref="/dashboard"
      actionLabel="Volver al dashboard"
    />
  );
}
