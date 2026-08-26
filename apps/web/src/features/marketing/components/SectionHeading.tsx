export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={`mx-auto max-w-2xl space-y-3 ${align === "center" ? "text-center" : "text-left"}`}>
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{eyebrow}</p> : null}
      <h2 className="text-3xl font-bold tracking-tight text-text-strong sm:text-4xl">{title}</h2>
      {description ? <p className="text-lg text-text-body">{description}</p> : null}
    </div>
  );
}
