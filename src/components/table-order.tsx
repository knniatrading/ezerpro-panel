"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Logo } from "./brand";
import { Storefront } from "./storefront";
import type { PublicTenant } from "@/lib/types";

type View =
  | { kind: "loading" }
  | { kind: "ok"; tenant: PublicTenant; table: string }
  | { kind: "bad" }
  | { kind: "error"; message: string };

/** Página que abre el QR de una mesa: la carta del negocio lista para pedir en esa mesa. */
export function TableOrder({ code }: { code: string }) {
  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    const host = window.location.hostname;
    Promise.all([
      api<PublicTenant>(`/public/tenant?host=${encodeURIComponent(host)}`),
      api<{ name: string }>(`/public/table/${encodeURIComponent(code)}?host=${encodeURIComponent(host)}`),
    ])
      .then(([tenant, table]) => setView({ kind: "ok", tenant, table: table.name }))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setView({ kind: "bad" });
        else setView({ kind: "error", message: e instanceof ApiError ? e.message : "No se pudo cargar." });
      });
  }, [code]);

  useEffect(() => {
    if (view.kind === "ok") document.title = `${view.table} | ${view.tenant.name}`;
  }, [view]);

  if (view.kind === "ok") {
    return (
      <main id="contenido">
        <Storefront tenant={view.tenant} tableCode={code} tableName={view.table} />
      </main>
    );
  }
  return (
    <main className="landing" id="contenido">
      <div className="landing__card">
        {view.kind === "loading" ? (
          <>
            <Logo tone="light" />
            <p className="landing__text" role="status">Cargando…</p>
          </>
        ) : view.kind === "bad" ? (
          <>
            <h1>Este código ya no sirve</h1>
            <p className="landing__text">Pídele ayuda a un mesero.</p>
          </>
        ) : (
          <>
            <h1>No pudimos cargar</h1>
            <p className="landing__text" role="alert">{view.message}</p>
            <button type="button" className="btn btn--secondary" onClick={() => location.reload()}>Reintentar</button>
          </>
        )}
      </div>
    </main>
  );
}
