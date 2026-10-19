"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { tenantOrigin } from "@/lib/tenant-url";
import type { GymProfileData } from "@/lib/types";
import { NoAccess } from "./no-access";
import { useGymAccess } from "./gym-common";

export function GymSettingsView() {
  const { state, allowed } = useGymAccess();
  const { data, error, reload } = useResource<GymProfileData>(allowed ? "/gym/profile" : null);
  const [f, setF] = useState({ gymName: "", phone: "", address: "", bio: "", reminderDays: 3, graceDays: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = data?.host ? tenantOrigin(data.host) : "";

  useEffect(() => {
    const p = data?.profile;
    if (p) setF({ gymName: p.gymName, phone: p.phone ?? "", address: p.address ?? "", bio: p.bio ?? "", reminderDays: p.reminderDays, graceDays: p.graceDays });
  }, [data]);
  useEffect(() => { if (url) QRCode.toDataURL(url, { width: 600, margin: 1 }).then(setQr).catch(() => setQr(null)); }, [url]);
  if (state.status === "in" && !allowed) return <NoAccess />;

  const touch = () => { setOk(false); setErr(null); };
  const text = (k: "gymName" | "phone" | "address" | "bio") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); touch(); };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(false);
    try {
      await api("/gym/profile", { method: "PATCH", body: JSON.stringify({ ...f, phone: f.phone.trim() || null, address: f.address.trim() || null, bio: f.bio.trim() || null }) });
      setOk(true); reload();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); } finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setErr("No se pudo copiar. Selecciona el enlace y cópialo."); }
  }
  return (
    <div className="page">
      <div className="page-head no-print"><div><h1>Mi gimnasio y QR</h1><p className="lede">Estos datos salen en la página pública de tu gimnasio y en los avisos por correo a tus socios.</p></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="card-admin no-print">
        <form onSubmit={save} noValidate className="card-admin__form">
          <div className="field"><label htmlFor="gs-name">Nombre del gimnasio</label><input id="gs-name" type="text" value={f.gymName} autoComplete="off" onChange={text("gymName")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="gs-phone">Celular (llamadas y WhatsApp)</label><input id="gs-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={text("phone")} /></div>
            <div className="field"><label htmlFor="gs-addr">Dirección</label><input id="gs-addr" type="text" value={f.address} autoComplete="off" onChange={text("address")} /></div>
          </div>
          <div className="field"><label htmlFor="gs-bio">Presentación</label><textarea id="gs-bio" rows={3} maxLength={400} value={f.bio} onChange={text("bio")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="gs-rem">Avisar el cobro con (días)</label><input id="gs-rem" type="number" min={0} max={15} value={f.reminderDays} onChange={(e) => { setF({ ...f, reminderDays: Number(e.target.value) }); touch(); }} /><p className="field__hint">Días antes de vencer en que el socio recibe el correo y sale en “por vencer”.</p></div>
            <div className="field"><label htmlFor="gs-grace">Días de gracia</label><input id="gs-grace" type="number" min={0} max={15} value={f.graceDays} onChange={(e) => { setF({ ...f, graceDays: Number(e.target.value) }); touch(); }} /><p className="field__hint">Días después de vencer en que todavía lo dejas entrar (con aviso).</p></div>
          </div>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          {ok ? <p className="note" role="status">Datos guardados.</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </form>
        <aside className="card-admin__qr">
          <h2 className="section-title">QR de tu gimnasio</h2>
          {qr ? <img src={qr} alt="Código QR de la página de tu gimnasio" width={220} height={220} /> : <p className="lede">Generando…</p>}
          <p className="field__hint" style={{ wordBreak: "break-all" }}>{url}</p>
          <div className="actions-cell">
            <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()} disabled={!qr}>Imprimir QR</button>
          </div>
          <p className="field__hint">Pégalo en la entrada: quien lo escanee ve tus planes y horarios, y tus socios entran a su portal.</p>
        </aside>
      </div>
      {qr ? (
        <div className="qr-sheet" aria-hidden="true">
          <div className="qr-card"><p className="qr-card__table">{data?.profile.gymName}</p><img src={qr} alt="" /><p className="qr-card__hint">Escanea para ver planes, horarios y entrar a tu portal</p>{data?.profile.phone ? <p className="qr-card__hint">{data.profile.phone}</p> : null}</div>
        </div>
      ) : null}
    </div>
  );
}
