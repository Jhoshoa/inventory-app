"use client";

import { useEffect, useState } from "react";

/** false mientras la pestaña o la app están en segundo plano (otra pestaña, otra app, pantalla bloqueada). */
export function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}
