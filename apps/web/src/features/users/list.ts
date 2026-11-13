import { formatTimeShort } from "@/lib/format/datetime";
import { businessDateKey, shiftDate } from "@/features/sales/list";
import type { UserInvitationResponse, UserResponse } from "./types";

// Usuarios y permisos (tableros A · Configuración y P10): textos de cada fila.

export const ROLE_LABEL = { owner: "Dueño", cashier: "Cajero" } as const;

export function initials(user: Pick<UserResponse, "full_name" | "email">) {
  const source = user.full_name?.trim() || user.email.split("@")[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
}

export function displayName(user: Pick<UserResponse, "full_name" | "email">) {
  return user.full_name?.trim() || user.email.split("@")[0];
}

/** "Ahora", "Hoy 11:30", "Ayer 09:10", "05/11/2026" o "Nunca entró". */
export function lastLoginText(iso: string | null | undefined, now: number) {
  if (!iso) return "Nunca entró";
  if (now - Date.parse(iso) < 5 * 60_000) return "Ahora";
  const day = businessDateKey(iso);
  const today = businessDateKey(new Date(now));
  if (day === today) return `Hoy ${formatTimeShort(iso)}`;
  if (day === shiftDate(today, -1)) return `Ayer ${formatTimeShort(iso)}`;
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}

/** "Invitación pendiente · vence en 6 días", "Vencida", "Revocada". */
export function invitationText(invitation: Pick<UserInvitationResponse, "status" | "expires_at">, now: number) {
  if (invitation.status === "revoked") return "Invitación revocada";
  if (invitation.status === "accepted") return "Invitación aceptada";
  const days = Math.ceil((Date.parse(invitation.expires_at) - now) / 86_400_000);
  if (invitation.status === "expired" || days <= 0) return "Invitación vencida";
  return `Invitación pendiente · vence en ${days === 1 ? "1 día" : `${days} días`}`;
}

export function isInvitationOpen(invitation: Pick<UserInvitationResponse, "status" | "expires_at">, now: number) {
  return invitation.status === "pending" && Date.parse(invitation.expires_at) > now;
}

/** Los mensajes de la API en palabras de la tienda. */
export function friendlyUserError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("ultimo owner") || text.includes("último owner") || text.includes("last owner")) {
    return "Siempre debe quedar al menos un dueño activo.";
  }
  if (text.includes("ya existe") || text.includes("already")) return "Esa persona ya está en la tienda o tiene una invitación.";
  return message;
}
