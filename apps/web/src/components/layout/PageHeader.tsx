import { ResponsiveActions } from "./ResponsiveActions";

export function PageHeader({
  actions,
  breadcrumbs,
  description,
  eyebrow,
  title,
  className = "",
}: {
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0">
        {breadcrumbs ? <div className="mb-2">{breadcrumbs}</div> : null}
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase text-text-muted">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-normal text-text-strong">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-text-muted">{description}</p> : null}
      </div>
      {actions ? <ResponsiveActions>{actions}</ResponsiveActions> : null}
    </div>
  );
}
