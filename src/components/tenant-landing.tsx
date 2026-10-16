"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Logo } from "./brand";
import type { PublicTenant } from "@/lib/types";

type View =
  | { kind: "loading" }
  | { kind: "ok"; tenant: PublicTenant }
  | { kind: "missing" }
  | { kind: "error"; message: string };

export function TenantLanding() {
  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    const host = window.location.hostname;
    api<PublicTenant>(`/public/tenant?host=${encodeURIComponent(host)}`)
      .then((tenant) => {
        if (!cancelled) setView({ kind: "ok", tenant });
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setView({ kind: "missing" });
        else
          setView({
            kind: "error",
            message: e instanceof ApiError ? e.message : "No se pudo cargar la página.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (view.kind === "loading") {
    return (
      <div className="boot" role="status" aria-live="polite">
        <Logo tone="light" />
        <span className="boot__text">Cargando…</span>
      </div>
    );
  }

  return (
    <main className="landing" id="contenido">
      <div className="landing__card">
        {view.kind === "ok" ? (
          <>
            <p className="landing__eyebrow">{view.tenant.distributor.companyName}</p>
            <h1>{view.tenant.name}</h1>
            {view.tenant.status === "suspended" ? (
              <p className="landing__text" role="status">
                Este servicio está suspendido por el momento. Comunícate con quien administra tu
                cuenta.
              </p>
            ) : (
              <>
                <p className="landing__text">Bienvenido. Entra para administrar tu negocio.</p>
                <Link href="/login" className="btn btn--primary">
                  Iniciar sesión
                </Link>
              </>
            )}
          </>
        ) : view.kind === "missing" ? (
          <>
            <h1>Esta dirección no existe</h1>
            <p className="landing__text">
              Revisa que la dirección esté bien escrita o pide el enlace correcto a quien te la
              dio.
            </p>
          </>
        ) : (
          <>
            <h1>No pudimos cargar la página</h1>
            <p className="landing__text" role="alert">
              {view.message}
            </p>
            <button type="button" className="btn btn--secondary" onClick={() => location.reload()}>
              Reintentar
            </button>
          </>
        )}
      </div>
      <p className="landing__foot">Con tecnología de EzerPro</p>
    </main>
  );
}
