"use client";

import { useEffect, useState } from "react";

/** true cuando la consulta se cumple; false en el servidor y hasta montar (evita diferencias al hidratar). */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}
