"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { stampCO } from "@/lib/dates";
import { useSession } from "./session";
import { NoAccess } from "./no-access";
import type { DemosResponse } from "@/lib/types";

function CopyLink({ label, url }: { label: string; url: string }) {
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
    <div style={{ marginTop: 10 }}>
      <p className="field__hint" style={{ margin: 0 }}>{label}</p>
      <p className="mono" style={{ margin: "4px 0 8px", overflowWrap: "anywhere" }}>{url}</p>
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
          <p className="lede">
            {isSuper
              ? "Demos de la plataforma. Aparecen solos en la página de ventas y cada distribuidor ve sus enlaces en su panel."
              : "Demos listos para tus prospectos. Copia el enlace y envíaselo: entra con un clic, sin contraseña, y puede probar todo."}
          </p>
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
              <CopyLink label="Enlace para el prospecto (muestra el botón «Entrar como distribuidor»):" url={data.distributorDemo.url} />
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

      <h2 className="section-title">Demos para clientes finales</h2>
      <p className="field__hint" style={{ marginBottom: 12 }}>Un demo por tipo de negocio, con datos de ejemplo de un mes. Se reinician solos cada madrugada.</p>
      <div className="demo-grid">
        {data?.demos.map((m) => (
          <section className="account-card" key={m.niche}>
            <h2>Demo de {m.label}</h2>
            <p className="field__hint">Entra como: {m.roles.map((r) => r.label.toLowerCase()).join(", ")}.</p>
            {m.host && m.adminUrl && m.clientUrl ? (
              <>
                <CopyLink label={`Entrar como ${(m.adminLabel ?? "administrador").toLowerCase()}:`} url={m.adminUrl} />
                <CopyLink label={`${m.clientLabel ?? "Ver lo que ve el cliente"}:`} url={m.clientUrl} />
                {m.resetAt ? <p className="field__hint">Último reinicio: {stampCO(m.resetAt)}.</p> : null}
              </>
            ) : (
              <p className="field__hint">{isSuper ? "Todavía no está creado." : "Este demo aún no está disponible."}</p>
            )}
            {isSuper ? (
              <div className="actions-cell" style={{ marginTop: 12 }}>
                <button type="button" className="btn btn--primary btn--sm" disabled={busy !== null} onClick={() => run(m.niche, "/demos/tenant", { niche: m.niche }, "Demo listo.")}>
                  {busy === m.niche ? "Preparando…" : m.host ? "Reiniciar datos" : "Crear demo"}
                </button>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
