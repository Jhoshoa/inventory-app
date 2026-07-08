"use client";

import { Suspense, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const calledRef = useRef(false);

  const redirectTo = useCallback(
    (path: string) => {
      router.replace(path);
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    if (calledRef.current) return;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code) {
      redirectTo("/login");
      return;
    }

    calledRef.current = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    fetch("/api/auth/oauth/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, state }),
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeout);
        redirectTo(res.ok ? "/dashboard" : "/login");
      })
      .catch(() => {
        clearTimeout(timeout);
        redirectTo("/login");
      });
  }, [redirectTo, searchParams]);

  return <p className="p-8 text-center">Completando autenticacion...</p>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Completando autenticacion...</p>}>
      <CallbackInner />
    </Suspense>
  );
}
