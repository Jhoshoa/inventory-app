import { Package } from "lucide-react";

export function StorefrontImagePlaceholder({
  colorPrimary,
  iconClassName = "h-8 w-8",
}: {
  colorPrimary?: string | null;
  iconClassName?: string;
}) {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-app-surface-muted to-app-border/40"
      style={
        colorPrimary
          ? { backgroundImage: `linear-gradient(135deg, ${colorPrimary}14, transparent)` }
          : undefined
      }
    >
      <Package className={`${iconClassName} text-text-disabled`} strokeWidth={1.25} aria-hidden="true" />
    </div>
  );
}
