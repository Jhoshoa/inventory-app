"use client";

import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/Button";

export function LogoutButton(props: ButtonProps) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return <Button variant="secondary" onClick={logout} {...props} />;
}
