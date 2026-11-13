import { describe, expect, it } from "vitest";
import { friendlyUserError, initials, invitationText, lastLoginText } from "./list";

const NOW = Date.parse("2026-11-12T15:30:00Z");

describe("users list helpers", () => {
  it("makes initials from the name or the email", () => {
    expect(initials({ full_name: "Rosa Quispe", email: "rosa@x.com" })).toBe("RQ");
    expect(initials({ full_name: null, email: "luis.mamani@x.com" })).toBe("LM");
    expect(initials({ full_name: "", email: "ana@x.com" })).toBe("AN");
  });

  it("says when they last came in, in Bolivia time", () => {
    expect(lastLoginText("2026-11-12T15:28:00Z", NOW)).toBe("Ahora");
    expect(lastLoginText("2026-11-12T15:30:00Z".replace("15:30", "15:30"), NOW + 3 * 3_600_000)).toBe("Hoy 11:30");
    expect(lastLoginText("2026-11-11T13:10:00Z", NOW)).toBe("Ayer 09:10");
    expect(lastLoginText("2026-11-05T13:10:00Z", NOW)).toBe("05/11/2026");
    expect(lastLoginText(null, NOW)).toBe("Nunca entró");
  });

  it("explains invitations", () => {
    expect(invitationText({ status: "pending", expires_at: "2026-11-18T15:00:00Z" }, NOW)).toBe("Invitación pendiente · vence en 6 días");
    expect(invitationText({ status: "pending", expires_at: "2026-11-10T15:00:00Z" }, NOW)).toBe("Invitación vencida");
    expect(invitationText({ status: "revoked", expires_at: "2026-11-18T15:00:00Z" }, NOW)).toBe("Invitación revocada");
  });

  it("explains the last owner rule", () => {
    expect(friendlyUserError("No se puede remover el ultimo owner activo")).toBe("Siempre debe quedar al menos un dueño activo.");
  });
});
