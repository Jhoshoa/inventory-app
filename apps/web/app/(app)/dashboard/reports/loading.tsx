import { PageSection } from "@/components/layout/PageSection";

export default function LoadingReports() {
  return (
    <PageSection className="space-y-6">
      <div className="h-16 rounded-lg bg-app-surface-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-lg bg-app-surface-muted" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-72 rounded-lg bg-app-surface-muted" />
        <div className="h-72 rounded-lg bg-app-surface-muted" />
      </div>
    </PageSection>
  );
}
