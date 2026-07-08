"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/login");
      return;
    }

    fetch("/api/auth/oauth/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => {
        if (res.ok) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"));
  }, [router, searchParams]);

  return <p className="p-8 text-center">Completando autenticacion...</p>;
}
