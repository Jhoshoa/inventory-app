import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import type { Session } from "@/lib/auth/session";
import { ProductCategorySettings } from "@/features/product-categories/components/ProductCategorySettings";
import type { ProductCategoryListResult } from "@/features/product-categories/types";
import { StoreDayEventTimeline } from "@/features/store-day/components/StoreDayEventTimeline";
import { StoreDayStatusPanel } from "@/features/store-day/components/StoreDayStatusPanel";
import type { CashMovementListResult, StoreDayClosingPreviewResult, StoreDayEventListResult, StoreDayResult } from "@/features/store-day/types";
import { PermissionMatrix } from "./PermissionMatrix";

export function SettingsOverview({
  session,
  storeDay,
  storeDayEvents,
  closingPreview,
  cashMovements,
  productCategories,
}: {
  session: Session;
  storeDay?: StoreDayResult;
  storeDayEvents?: StoreDayEventListResult;
  closingPreview?: StoreDayClosingPreviewResult;
  cashMovements?: CashMovementListResult;
  productCategories?: ProductCategoryListResult;
}) {
  return (
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Ajustes" },
            ]}
          />
        }
        title="Ajustes"
        description="Centro administrativo para tienda, permisos y operacion diaria."
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <AdminSummaryCard
          title="Tienda"
          description="Datos base del negocio activo."
          items={[
            { label: "Nombre", value: session.storeName },
            { label: "ID tienda", value: session.storeId ? shortId(session.storeId) : "N/A" },
          ]}
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
            description="Capacidades disponibles para propietario y cajero en el MVP."
          >
            <PermissionMatrix />
          </AdminSection>

          {productCategories ? (
            productCategories.ok ? (
              <ProductCategorySettings categories={productCategories.data.items} />
            ) : (
              <AdminSection
                title="Categorias"
                description="Agrupacion de productos y prefijos SKU."
              >
                <DataFetchError resource="las categorias" error={productCategories.error.message} />
              </AdminSection>
            )
          ) : null}

          <AdminSection
            title="Usuarios"
            description="Invitaciones y administracion de miembros."
          >
            <PlannedUsersBlock role={session.role} />
          </AdminSection>
        </div>

        <div className="min-w-0 space-y-6">
          <AdminSection
            title="Operacion diaria"
            description="Apertura, cierre y trazabilidad de jornada."
          >
            <div className="space-y-3">
              {storeDay ? (
                <StoreDayManagement
                  storeDay={storeDay}
                  role={session.role}
                  closingPreview={closingPreview}
                  cashMovements={cashMovements}
                />
              ) : (
                <p className="text-sm text-text-muted">
                  El estado de jornada no esta disponible en esta vista.
                </p>
              )}
              {storeDayEvents ? (
                <StoreDayEventTimeline
                  events={storeDayEvents}
                  timezone={storeDay?.ok ? storeDay.data.timezone : undefined}
                />
              ) : null}
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-text-muted">Administracion</p>
          <h2 className="mt-1 text-lg font-semibold text-text-strong">{title}</h2>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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

function PlannedUsersBlock({ role }: { role: Session["role"] }) {
  const owner = role === "owner";

  return (
    <div className="rounded-lg border border-app-border bg-app-surface-muted p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-text-strong">Gestion de usuarios</h3>
            <Badge variant="default">Planificado</Badge>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Invitaciones, cambio de roles y administracion de miembros se implementaran como feature dedicada despues del MVP visual.
          </p>
        </div>
        <Badge variant={owner ? "success" : "default"}>
          {owner ? "Propietario tendrá acceso" : "Solo lectura"}
        </Badge>
      </div>
    </div>
  );
}

function StoreDayManagement({
  storeDay,
  role,
  closingPreview,
  cashMovements,
}: {
  storeDay: StoreDayResult;
  role: Session["role"];
  closingPreview?: StoreDayClosingPreviewResult;
  cashMovements?: CashMovementListResult;
}) {
  if (!storeDay.ok) {
    return (
      <DataFetchError resource="el estado de tienda" error={storeDay.error.message} />
    );
  }

  return (
    <StoreDayStatusPanel
      storeDay={storeDay.data}
      role={role}
      actions="manage"
      closingPreview={closingPreview}
      cashMovements={cashMovements}
    />
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
      {role === "owner" ? "Propietario" : "Cajero"}
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
