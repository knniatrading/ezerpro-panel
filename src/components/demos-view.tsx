"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { tenantOrigin } from "@/lib/tenant-url";
import { stampCO } from "@/lib/dates";
import { useSession } from "./session";
import { NoAccess } from "./no-access";
import type { DemosResponse } from "@/lib/types";

function CopyLink({ url }: { url: string }) {
  const [msg, setMsg] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Enlace copiado");
    } catch {
      setMsg("No se pudo copiar. Selecciónalo y cópialo a mano.");
    }
  }
  return (
    <div>
      <p className="mono" style={{ margin: "6px 0 8px", overflowWrap: "anywhere" }}>{url}</p>
      <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>Copiar enlace</button>
      <span role="status" className="field__hint" style={{ marginLeft: 10 }}>{msg}</span>
    </div>
  );
}

export function DemosView() {
  const { state } = useSession();
  const allowed = state.status === "in" && (state.user.role === "SUPER_ADMIN" || state.user.role === "DISTRIBUTOR_ADMIN");
  const isSuper = state.status === "in" && state.user.role === "SUPER_ADMIN";
  const { data, error, reload } = useResource<DemosResponse>(allowed ? "/demos" : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [panelUrl, setPanelUrl] = useState("");
  useEffect(() => setPanelUrl(`${window.location.origin}/login`), []);
  if (state.status === "in" && !allowed) return <NoAccess />;

  async function run(key: string, path: string, body: object, okMsg: string) {
    setBusy(key);
    setErr(null);
    setNote(null);
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      setNote(okMsg);
      reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo completar. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Demos</h1>
          <p className="lede">Negocios de ejemplo para mostrar la plataforma a tus prospectos. Quien abre el enlace entra con un clic, sin contraseña.</p>
        </div>
      </header>
      {error ? <div className="banner banner--error" role="alert"><span>{error}</span></div> : null}
      {err ? <div className="banner banner--error" role="alert"><span>{err}</span></div> : null}
      {note ? <div className="banner" role="status"><span>{note}</span></div> : null}

      {isSuper ? (
        <section className="account-card" style={{ marginBottom: 20 }}>
          <h2>Demo para vender a distribuidores</h2>
          <p className="field__hint">Un distribuidor de ejemplo con 6 clientes (activos, en prueba, vencido y suspendido), sus pagos y los pagos a la plataforma.</p>
          {data?.distributorDemo ? (
            <>
              <p className="field__hint" style={{ marginTop: 10 }}>
                Se abre desde la pantalla de inicio de sesión del panel (botón «Entrar como distribuidor»). Enlace para compartir:
              </p>
              <CopyLink url={panelUrl} />
              {data.distributorDemo.resetAt ? <p className="field__hint">Último reinicio: {stampCO(data.distributorDemo.resetAt)}</p> : null}
            </>
          ) : null}
          <div className="actions-cell" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn--primary btn--sm" disabled={busy !== null} onClick={() => run("dist", "/demos/distributor", {}, "Demo del distribuidor listo.")}>
              {busy === "dist" ? "Preparando…" : data?.distributorDemo ? "Reiniciar datos" : "Crear demo"}
            </button>
          </div>
        </section>
      ) : null}

      <h2 className="section-title">Demo de Comidas Rápidas</h2>
      <p className="field__hint" style={{ marginBottom: 12 }}>
        Una hamburguesería con carta, mesas, personal, un mes de ventas, pedidos en curso y nómina. Quien abre el enlace puede entrar como:{" "}
        {data?.roles.map((r) => r.label.toLowerCase()).join(", ")}.
      </p>
      {data && data.items.length === 0 ? (
        <section className="note"><h2>Aún no hay distribuidores</h2><p>Crea un distribuidor para poder armarle su demo.</p></section>
      ) : null}
      <div className="demo-grid">
        {data?.items.map((d) => (
          <section className="account-card" key={d.distributorId}>
            <h2>{isSuper ? d.companyName : "Tu demo"}</h2>
            {d.demo ? (
              <>
                <CopyLink url={tenantOrigin(d.demo.host)} />
                {d.demo.resetAt ? <p className="field__hint">Último reinicio: {stampCO(d.demo.resetAt)}. Se reinicia solo cada madrugada.</p> : null}
              </>
            ) : (
              <p className="field__hint">Todavía no tiene demo.</p>
            )}
            <div className="actions-cell" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn--primary btn--sm" disabled={busy !== null} onClick={() => run(d.distributorId, "/demos/tenant", { distributorId: d.distributorId }, "Demo listo.")}>
                {busy === d.distributorId ? "Preparando…" : d.demo ? "Reiniciar datos" : "Crear demo"}
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
