import { ErrorState } from "@/components/ui/ErrorState";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
      <ErrorState
        title="Página no encontrada"
        description="La página que buscas no existe o cambió de lugar."
        actionHref="/dashboard"
        actionLabel="Volver a Inicio"
      />
    </main>
  );
}
