import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Store as StoreIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import type { Session } from "@/lib/auth/session";
import { formatPhone } from "@/lib/format/phone";
import { UsersSection } from "@/features/users/components/UsersSection";
import type { UserInvitationListResult, UserListResult } from "@/features/users/types";
import { DiscountPolicyDialog } from "./DiscountPolicyDialog";
import { StoreEditorDialog } from "./StoreEditorDialog";
import type { StoreResponse } from "../types";
import { PermissionMatrix } from "./PermissionMatrix";

export function SettingsOverview({
  session,
  storeData,
  users,
  userInvitations,
}: {
  session: Session;
  storeData?: StoreResponse;
  users?: UserListResult;
  userInvitations?: UserInvitationListResult;
}) {
  return (
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Inicio", href: "/dashboard" },
              { label: "Configuración" },
            ]}
          />
        }
        title="Configuración"
        description="Datos de la tienda, permisos y personas."
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <AdminSummaryCard
          title="Tienda"
          description="Datos base del negocio activo."
          items={
            storeData
              ? [
                  { label: "Nombre", value: storeData.name },
                  { label: "ID tienda", value: shortId(session.storeId ?? "") },
                  { label: "Direccion", value: storeData.address ?? "—" },
                  { label: "Telefono", value: formatPhone(storeData.phone) || "—" },
                ]
              : [
                  { label: "Nombre", value: session.storeName },
                  { label: "ID tienda", value: shortId(session.storeId ?? "") },
                ]
          }
          action={
            session.role === "owner" && storeData ? (
              <div className="flex flex-wrap gap-2">
                <StoreEditorDialog storeData={storeData} />
                <DiscountPolicyDialog storeData={storeData} />
                <Button asChild variant="ghost">
                  <Link href="/dashboard/settings/catalogo">
                    <StoreIcon className="h-4 w-4" aria-hidden="true" />
                    Catalogo publico
                  </Link>
                </Button>
              </div>
            ) : undefined
          }
        />
        <AdminSummaryCard
          title="Usuario actual"
          description="Sesion y alcance operativo."
          items={[
            { label: "Correo electrónico", value: session.email },
            { label: "ID usuario", value: shortId(session.userId) },
          ]}
          badge={<RoleBadge role={session.role} />}
        />
        <AdminSummaryCard
          title="Suscripcion"
          description="Plan, facturacion y estado de cuenta."
          items={[
            { label: "Estado", value: subscriptionLabel(session.subscriptionStatus) },
            { label: "Acceso", value: accessLabel(session.accessStatus) },
          ]}
          action={
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent-primary hover:text-accent-primary-hover"
            >
              Gestionar <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <div className="min-w-0 space-y-6">
          <AdminSection
            title="Permisos"
            description="Capacidades disponibles para dueño y cajero en el MVP."
          >
            <PermissionMatrix />
          </AdminSection>

          {session.role === "owner" && users && userInvitations ? (
            <AdminSection
              title="Usuarios"
              description="Invitaciones y administracion de miembros."
            >
              <UsersSection users={users} invitations={userInvitations} currentUserId={session.userId} />
            </AdminSection>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          <AdminSection title="Caja y jornada" description="Ahora tiene su propia página.">
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-text-muted">
                Abrir y cerrar la caja, las entradas y salidas de efectivo y el historial del día están en Caja.
              </p>
              <Button asChild variant="secondary">
                <Link href="/dashboard/caja">Ir a Caja</Link>
              </Button>
            </div>
          </AdminSection>
          <AdminSection title="Categorías y lugares" description="Ahora están en Productos.">
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-text-muted">
                Las categorías (prefijo del SKU), los lugares en la tienda y el aviso de vencimiento se usan al cargar
                productos, así que pasaron a Productos.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary">
                  <Link href="/dashboard/products/categorias">Ir a Categorías</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/dashboard/products/lugares">Ir a Lugares en la tienda</Link>
                </Button>
              </div>
            </div>
          </AdminSection>
        </div>
      </div>
    </PageSection>
  );
}

function AdminSummaryCard({
  action,
  badge,
  description,
  items,
  title,
}: {
  action?: ReactNode;
  badge?: ReactNode;
  description: string;
  items: Array<{ label: string; value: string }>;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-text-muted">Administracion</p>
          <h2 className="mt-1 text-lg font-semibold text-text-strong">{title}</h2>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {action}
          {badge ? <div>{badge}</div> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <InfoItem key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </section>
  );
}

function AdminSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <CollapsibleSection title={title} description={description} defaultOpen>
      {children}
    </CollapsibleSection>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-text-muted">{label}</p>
      <p className="mt-2 truncate text-sm font-medium text-text-strong">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: Session["role"] }) {
  return (
    <Badge variant={role === "owner" ? "success" : "default"}>
      {role === "owner" ? "Dueño" : "Cajero"}
    </Badge>
  );
}

function shortId(value: string) {
  return value.slice(0, 8);
}

const SUBSCRIPTION_LABELS: Record<string, string> = {
  trial: "Prueba gratuita",
  active: "Activo",
  past_due: "Vencido",
  expired: "Suspendido",
  canceled: "Cancelado",
};

const ACCESS_LABELS: Record<string, string> = {
  active: "Activo",
  suspended: "Suspendido",
  archived: "Archivado",
  purged: "Eliminado",
};

function subscriptionLabel(status: string | null) {
  return status ? SUBSCRIPTION_LABELS[status] ?? status : "—";
}

function accessLabel(status: string | null) {
  return status ? ACCESS_LABELS[status] ?? status : "—";
}
