import { ErrorState } from "@/components/ui/ErrorState";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
      <ErrorState
        title="Pagina no encontrada"
        description="La ruta que buscas no existe o fue movida."
        actionHref="/dashboard"
        actionLabel="Volver al dashboard"
      />
    </main>
  );
}
