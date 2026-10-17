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
  // El demo del distribuidor se abre en la dirección del panel (panel.dominio), nunca en la de un negocio.
  useEffect(() => {
    const { protocol, hostname, port } = window.location;
    const panelHost = hostname.startsWith("panel.") ? hostname : `panel.${hostname.split(".").slice(1).join(".")}`;
    setPanelUrl(`${protocol}//${panelHost}${port ? `:${port}` : ""}/login`);
  }, []);
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
                Este enlace lleva al inicio de sesión del panel, donde aparece el botón «Entrar como distribuidor». Compártelo con el distribuidor que quieras convencer:
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

      <p className="field__hint" style={{ marginBottom: 12 }}>
        Un demo por tipo de negocio, con datos de ejemplo de un mes. Aparecen solos en tu página de ventas.
      </p>
      {data && data.items.length === 0 ? (
        <section className="note"><h2>Aún no hay distribuidores</h2><p>Crea un distribuidor para poder armarle su demo.</p></section>
      ) : null}
      {data?.items.map((d) => (
        <div key={d.distributorId}>
          {isSuper ? <h2 className="section-title">{d.companyName}</h2> : null}
          <div className="demo-grid">
            {d.demos.map((m) => {
              const key = `${d.distributorId}:${m.niche}`;
              return (
                <section className="account-card" key={key}>
                  <h2>Demo de {m.label}</h2>
                  <p className="field__hint">Entra como: {m.roles.map((r) => r.label.toLowerCase()).join(", ")}.</p>
                  {m.host ? (
                    <>
                      <CopyLink url={tenantOrigin(m.host)} />
                      {m.resetAt ? <p className="field__hint">Último reinicio: {stampCO(m.resetAt)}. Se reinicia solo cada madrugada.</p> : null}
                    </>
                  ) : (
                    <p className="field__hint">Todavía no tiene demo.</p>
                  )}
                  <div className="actions-cell" style={{ marginTop: 12 }}>
                    <button type="button" className="btn btn--primary btn--sm" disabled={busy !== null} onClick={() => run(key, "/demos/tenant", { distributorId: d.distributorId, niche: m.niche }, "Demo listo.")}>
                      {busy === key ? "Preparando…" : m.host ? "Reiniciar datos" : "Crear demo"}
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
