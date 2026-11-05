import { readableTextColor } from "../settings";

export function StorefrontAnnouncement({ text, color }: { text: string; color?: string | null }) {
  const background = color ?? "#111111";
  return (
    <div
      role="note"
      className="px-4 py-2 text-center text-sm font-medium"
      style={{ backgroundColor: background, color: readableTextColor(background) }}
    >
      <p className="mx-auto max-w-5xl break-words">{text}</p>
    </div>
  );
}
