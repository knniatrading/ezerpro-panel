"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { tenantOrigin } from "@/lib/tenant-url";
import type { SalonProfileData } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ADMIN, errMsg, useSalonAccess } from "./salon-common";

function QrBox({ title, url, hint, data }: { title: string; url: string; hint: string; data: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (url) QRCode.toDataURL(url, { width: 600, margin: 1 }).then(setQr).catch(() => setQr(null)); }, [url]);
  async function copy() { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } }
  return (
    <>
      <aside className="card-admin__qr no-print">
        <h2 className="section-title">{title}</h2>
        {qr ? <img src={qr} alt={`Código QR: ${title}`} width={180} height={180} /> : <p className="lede">Generando…</p>}
        <p className="field__hint" style={{ wordBreak: "break-all" }}>{url}</p>
        <div className="actions-cell"><button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button><button type="button" className="btn btn--primary btn--sm" disabled={!qr} onClick={() => { document.body.dataset.printQr = title; window.print(); delete document.body.dataset.printQr; }}>Imprimir QR</button></div>
        <p className="field__hint">{hint}</p>
      </aside>
      {qr ? <div className="qr-sheet" aria-hidden="true"><div className="qr-card"><p className="qr-card__table">{data}</p><img src={qr} alt="" /><p className="qr-card__hint">{hint}</p></div></div> : null}
    </>
  );
}

export function SalonSettingsView() {
  const { state, allowed } = useSalonAccess(ADMIN);
  const { data, error, reload } = useResource<SalonProfileData>(allowed ? "/salon/profile" : null);
  const [f, setF] = useState({ salonName: "", phone: "", address: "", bio: "", reminders: true, cashierMaxDiscount: "10" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const origin = data?.host ? tenantOrigin(data.host) : "";
  useEffect(() => { const p = data?.profile; if (p) setF({ salonName: p.salonName, phone: p.phone ?? "", address: p.address ?? "", bio: p.bio ?? "", reminders: p.reminders ?? true, cashierMaxDiscount: String(p.cashierMaxDiscount) }); }, [data]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const touch = () => { setOk(false); setErr(null); };
  const text = (k: "salonName" | "phone" | "address" | "bio") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); touch(); };
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null); setOk(false);
    try { await api("/salon/profile", { method: "PATCH", body: JSON.stringify({ salonName: f.salonName, phone: f.phone.trim() || null, address: f.address.trim() || null, bio: f.bio.trim() || null, reminders: f.reminders, cashierMaxDiscount: Number(f.cashierMaxDiscount) || 0 }) }); setOk(true); reload(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  return (
    <div className="page">
      <div className="page-head no-print"><div><h1>Mi salón y QR</h1><p className="lede">Estos datos salen en tu página de reservas, en la tienda y en los correos a tus clientes.</p></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="card-admin no-print">
        <form onSubmit={save} noValidate className="card-admin__form">
          <div className="field"><label htmlFor="ss-name">Nombre del salón</label><input id="ss-name" type="text" value={f.salonName} autoComplete="off" onChange={text("salonName")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="ss-phone">Celular (llamadas y WhatsApp)</label><input id="ss-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={text("phone")} /></div>
            <div className="field"><label htmlFor="ss-addr">Dirección</label><input id="ss-addr" type="text" value={f.address} autoComplete="off" onChange={text("address")} /></div>
          </div>
          <div className="field"><label htmlFor="ss-bio">Presentación</label><textarea id="ss-bio" rows={3} maxLength={400} value={f.bio} onChange={text("bio")} /></div>
          <div className="field"><label htmlFor="ss-disc">Descuento máximo que puede dar Recepción (%)</label><input id="ss-disc" type="text" inputMode="numeric" value={f.cashierMaxDiscount} autoComplete="off" onChange={(e) => { setF({ ...f, cashierMaxDiscount: e.target.value.replace(/\D/g, "").slice(0, 2) }); touch(); }} /></div>
          <label className="check"><input type="checkbox" checked={f.reminders} onChange={(e) => { setF({ ...f, reminders: e.target.checked }); touch(); }} /> Enviar recordatorios automáticos por correo (24 horas y 2 horas antes)</label>
          <p className="field__hint">Solo le llega a los clientes con correo registrado, con un enlace para confirmar o cancelar. Por WhatsApp, el recordatorio se envía con un clic desde la agenda.</p>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          {ok ? <p className="note" role="status">Datos guardados.</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </form>
        {origin ? <div>
          <QrBox title="QR para reservar" url={`${origin}/reservar`} data={f.salonName} hint="Escanea para reservar tu cita" />
          <QrBox title="QR de la tienda" url={`${origin}/tienda`} data={f.salonName} hint="Escanea para ver nuestros productos" />
        </div> : null}
      </div>
    </div>
  );
}
