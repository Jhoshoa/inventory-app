import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { EmptyState } from "@/components/ui/EmptyState";
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
        description="Configuracion de tienda, usuarios y permisos."
      />

      <div className="grid gap-4 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel sm:grid-cols-3">
        <InfoItem label="Usuario" value={session.email} />
        <InfoItem label="Tienda" value={session.storeName} />
        <div>
          <p className="text-xs font-medium uppercase text-text-muted">Rol</p>
          <div className="mt-2">
            <Badge variant={session.role === "owner" ? "success" : "default"}>
              {session.role}
            </Badge>
          </div>
        </div>
      </div>

      <CollapsibleSection
        title="Permisos v1"
        description="Resumen de capacidades para owner y cashier."
      >
        <PermissionMatrix />
      </CollapsibleSection>

      {productCategories ? (
        productCategories.ok ? (
          <ProductCategorySettings categories={productCategories.data.items} />
        ) : (
          <Alert variant="error">
            No se pudieron cargar las categorias: {productCategories.error.message}
          </Alert>
        )
      ) : null}

      <CollapsibleSection
        title="Operacion diaria"
        description="Apertura y cierre de la jornada de ventas."
      >
        <div className="space-y-3">
          {storeDay ? (
            <StoreDayManagement
              storeDay={storeDay}
              role={session.role}
              closingPreview={closingPreview}
              cashMovements={cashMovements}
            />
          ) : null}
          {storeDayEvents ? (
            <StoreDayEventTimeline
              events={storeDayEvents}
              timezone={storeDay?.ok ? storeDay.data.timezone : undefined}
            />
          ) : null}
        </div>
      </CollapsibleSection>

      <EmptyState
        title="Gestion de usuarios pendiente"
        description="Invitaciones, cambio de roles y administracion de usuarios quedan para un sprint dedicado."
      />
    </PageSection>
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
      <Alert variant="error">
        No se pudo cargar el estado de tienda: {storeDay.error.message}
      </Alert>
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
      <p className="mt-2 text-sm font-medium text-text-strong">{value}</p>
    </div>
  );
}
