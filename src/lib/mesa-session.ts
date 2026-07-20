import { useEffect, useState } from "react";

export type MesaSession = { mesa_id: string; numero: number };
const KEY = "mesa_session_v1";

export function readMesaSession(): MesaSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setMesaSession(s: MesaSession | null) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("mesa:update"));
}

export function useMesaSession() {
  const [mesa, setMesa] = useState<MesaSession | null>(null);
  useEffect(() => {
    setMesa(readMesaSession());
    const on = () => setMesa(readMesaSession());
    window.addEventListener("mesa:update", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("mesa:update", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return { mesa, setMesa: (s: MesaSession | null) => setMesaSession(s) };
}
