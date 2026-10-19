"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { tenantOrigin } from "@/lib/tenant-url";
import type { ClinicProfileData } from "@/lib/types";
import { NoAccess } from "./no-access";
import { errMsg, useClinicAccess } from "./clinic-common";

export function ClinicSettingsView() {
  const { state, allowed } = useClinicAccess();
  const { data, error, reload } = useResource<ClinicProfileData>(allowed ? "/clinic/profile" : null);
  const [f, setF] = useState({ clinicName: "", phone: "", address: "", bio: "", reminders: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = data?.host ? tenantOrigin(data.host) : "";
  useEffect(() => { const p = data?.profile; if (p) setF({ clinicName: p.clinicName, phone: p.phone ?? "", address: p.address ?? "", bio: p.bio ?? "", reminders: p.reminders }); }, [data]);
  useEffect(() => { if (url) QRCode.toDataURL(url, { width: 600, margin: 1 }).then(setQr).catch(() => setQr(null)); }, [url]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const touch = () => { setOk(false); setErr(null); };
  const text = (k: "clinicName" | "phone" | "address" | "bio") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); touch(); };
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null); setOk(false);
    try { await api("/clinic/profile", { method: "PATCH", body: JSON.stringify({ ...f, phone: f.phone.trim() || null, address: f.address.trim() || null, bio: f.bio.trim() || null }) }); setOk(true); reload(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setErr("No se pudo copiar. Selecciona el enlace y cópialo."); } }
  return (
    <div className="page">
      <div className="page-head no-print"><div><h1>Mi consultorio y QR</h1><p className="lede">Estos datos salen en tu página pública, en las recetas y en los correos a tus pacientes.</p></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="card-admin no-print">
        <form onSubmit={save} noValidate className="card-admin__form">
          <div className="field"><label htmlFor="cs-name">Nombre de la clínica</label><input id="cs-name" type="text" value={f.clinicName} autoComplete="off" onChange={text("clinicName")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="cs-phone">Celular (llamadas y WhatsApp)</label><input id="cs-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={text("phone")} /></div>
            <div className="field"><label htmlFor="cs-addr">Dirección</label><input id="cs-addr" type="text" value={f.address} autoComplete="off" onChange={text("address")} /></div>
          </div>
          <div className="field"><label htmlFor="cs-bio">Presentación</label><textarea id="cs-bio" rows={3} maxLength={400} value={f.bio} onChange={text("bio")} /></div>
          <label className="check"><input type="checkbox" checked={f.reminders} onChange={(e) => { setF({ ...f, reminders: e.target.checked }); touch(); }} /> Enviar recordatorios automáticos de cita por correo (24 horas y 2 horas antes)</label>
          <p className="field__hint">Solo le llega a los pacientes que tienen correo registrado. Incluye un enlace para confirmar o cancelar.</p>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          {ok ? <p className="note" role="status">Datos guardados.</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </form>
        <aside className="card-admin__qr">
          <h2 className="section-title">QR de tu clínica</h2>
          {qr ? <img src={qr} alt="Código QR de la página de tu clínica" width={220} height={220} /> : <p className="lede">Generando…</p>}
          <p className="field__hint" style={{ wordBreak: "break-all" }}>{url}</p>
          <div className="actions-cell"><button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button><button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()} disabled={!qr}>Imprimir QR</button></div>
          <p className="field__hint">Ponlo en recepción: quien lo escanee puede pedir su cita y entrar a su portal.</p>
        </aside>
      </div>
      {qr ? <div className="qr-sheet" aria-hidden="true"><div className="qr-card"><p className="qr-card__table">{data?.profile.clinicName}</p><img src={qr} alt="" /><p className="qr-card__hint">Escanea para pedir tu cita y ver tu portal de paciente</p>{data?.profile.phone ? <p className="qr-card__hint">{data.profile.phone}</p> : null}</div></div> : null}
    </div>
  );
}
