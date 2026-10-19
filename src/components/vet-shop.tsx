"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { PublicTenant } from "@/lib/types";
import { Storefront } from "./storefront";

/** Tienda de la clínica (productos con domicilio o recogida). */
export function VetShop() {
  const [t, setT] = useState<PublicTenant | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<PublicTenant>(`/public/tenant?host=${encodeURIComponent(window.location.hostname)}`).then(setT).catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar la tienda."));
  }, []);
  if (error) return <main className="landing"><div className="landing__card"><h1>Tienda</h1><p className="landing__text" role="alert">{error}</p></div></main>;
  if (!t) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (t.status === "suspended") return <main className="landing"><div className="landing__card"><h1>{t.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></main>;
  return <main id="contenido"><Storefront tenant={t} /></main>;
}
