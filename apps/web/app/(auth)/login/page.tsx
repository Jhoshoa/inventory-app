import Link from "next/link";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-950">
            Inventory App
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ingresa para administrar tu tienda.
          </p>
        </div>
        <LoginForm />
        <p className="mt-5 text-center text-sm text-slate-600">
          No tienes cuenta?{" "}
          <Link className="font-medium text-slate-950 underline" href="/register">
            Crea una tienda
          </Link>
        </p>
      </section>
    </main>
  );
}
