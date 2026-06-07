import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/features/auth/components/AuthShell";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Crear tienda"
      description="El registro completo se conectara al backend despues de cerrar la base de auth."
      footerText="Ya tienes cuenta?"
      footerHref="/login"
      footerLinkLabel="Inicia sesion"
    >
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="store-name">Nombre de tienda</Label>
          <Input id="store-name" name="storeName" disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" disabled />
        </div>
        <Button className="w-full" disabled>
          Registro en Sprint posterior
        </Button>
      </form>
    </AuthShell>
  );
}
