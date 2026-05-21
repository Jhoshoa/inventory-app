import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsOverview } from "./SettingsOverview";
import type { Session } from "@/lib/auth/session";

const session: Session = {
  userId: "user-1",
  email: "owner@example.com",
  storeId: "store-1",
  storeName: "Mi tienda",
  fullName: null,
  role: "owner",
};

describe("SettingsOverview", () => {
  it("renders session role and permission matrix", () => {
    render(<SettingsOverview session={session} />);

    expect(screen.getByText("owner")).toBeInTheDocument();
    expect(screen.getByText("Exportar CSV")).toBeInTheDocument();
    expect(screen.getByText("Gestion de usuarios pendiente")).toBeInTheDocument();
  });
});
