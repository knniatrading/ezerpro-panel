"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { tenantOrigin } from "@/lib/tenant-url";
import type { FerreProfileData } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ADMIN, errMsg, useFerreAccess } from "./ferre-common";

export function FerreSettingsView() {
  const { state, allowed } = useFerreAccess(ADMIN);
  const { data, error, reload } = useResource<FerreProfileData>(allowed ? "/ferre/profile" : null);
  const [f, setF] = useState({ shopName: "", phone: "", address: "", bio: "", nit: "", cashierMaxDiscount: "0", quoteDays: "15", quoteNote: "", reminders: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = data?.host ? tenantOrigin(data.host) : "";
  useEffect(() => { const p = data?.profile; if (p) setF({ shopName: p.shopName, phone: p.phone ?? "", address: p.address ?? "", bio: p.bio ?? "", nit: p.nit ?? "", cashierMaxDiscount: String(p.cashierMaxDiscount), quoteDays: String(p.quoteDays), quoteNote: p.quoteNote ?? "", reminders: p.reminders ?? true }); }, [data]);
  useEffect(() => { if (url) QRCode.toDataURL(`${url}/catalogo`, { width: 600, margin: 1 }).then(setQr).catch(() => setQr(null)); }, [url]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const touch = () => { setOk(false); setErr(null); };
  const text = (k: "shopName" | "phone" | "address" | "bio" | "nit" | "quoteNote") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); touch(); };
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null); setOk(false);
    try {
      await api("/ferre/profile", { method: "PATCH", body: JSON.stringify({ shopName: f.shopName, phone: f.phone.trim() || null, address: f.address.trim() || null, bio: f.bio.trim() || null, nit: f.nit.trim() || null, cashierMaxDiscount: Number(f.cashierMaxDiscount || 0), quoteDays: Number(f.quoteDays || 15), quoteNote: f.quoteNote.trim() || null, reminders: f.reminders }) });
      setOk(true); reload();
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(`${url}/catalogo`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setErr("No se pudo copiar. Selecciona el enlace y cópialo."); } }
  return (
    <div className="page">
      <div className="page-head no-print"><div><h1>Mi ferretería y QR</h1><p className="lede">Estos datos salen en tu página, en los recibos, en las cotizaciones y en los correos.</p></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="card-admin no-print">
        <form onSubmit={save} noValidate className="card-admin__form">
          <div className="field"><label htmlFor="fs-name">Nombre de la ferretería</label><input id="fs-name" type="text" value={f.shopName} autoComplete="off" onChange={text("shopName")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="fs-phone">Celular (llamadas y WhatsApp)</label><input id="fs-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={text("phone")} /></div>
            <div className="field"><label htmlFor="fs-nit">NIT</label><input id="fs-nit" type="text" value={f.nit} autoComplete="off" onChange={text("nit")} /></div>
          </div>
          <div className="field"><label htmlFor="fs-addr">Dirección</label><input id="fs-addr" type="text" value={f.address} autoComplete="off" onChange={text("address")} /></div>
          <div className="field"><label htmlFor="fs-bio">Presentación</label><textarea id="fs-bio" rows={3} maxLength={400} value={f.bio} onChange={text("bio")} /></div>
          <fieldset className="field"><legend>Control del vendedor</legend>
            <div className="field-row">
              <div className="field"><label htmlFor="fs-disc">Descuento máximo que puede dar un vendedor (%)</label><input id="fs-disc" type="number" min={0} max={50} value={f.cashierMaxDiscount} onChange={(e) => { setF({ ...f, cashierMaxDiscount: e.target.value }); touch(); }} /></div>
              <div className="field"><label htmlFor="fs-qd">Validez de las cotizaciones (días)</label><input id="fs-qd" type="number" min={1} max={90} value={f.quoteDays} onChange={(e) => { setF({ ...f, quoteDays: e.target.value }); touch(); }} /></div>
            </div>
            <p className="field__hint">Con 0 % el vendedor no puede dar descuentos. Nunca puede cambiar precios, anular ventas ni ver ganancias.</p>
          </fieldset>
          <div className="field"><label htmlFor="fs-qn">Nota al pie de las cotizaciones</label><textarea id="fs-qn" rows={2} maxLength={400} value={f.quoteNote} placeholder="Ej.: Precios sujetos a cambio. Despachamos a obra con costo adicional." onChange={text("quoteNote")} /></div>
          <label className="check"><input type="checkbox" checked={f.reminders} onChange={(e) => { setF({ ...f, reminders: e.target.checked }); touch(); }} /> Enviar recordatorios de pago por correo a clientes con facturas vencidas (una vez por semana)</label>
          <p className="field__hint">Solo le llega a los clientes que tienen correo registrado. Siempre puedes avisar por WhatsApp desde “Cuentas por cobrar”.</p>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          {ok ? <p className="note" role="status">Datos guardados.</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </form>
        <aside className="card-admin__qr">
          <h2 className="section-title">QR de tu catálogo</h2>
          {qr ? <img src={qr} alt="Código QR del catálogo de tu ferretería" width={220} height={220} /> : <p className="lede">Generando…</p>}
          <p className="field__hint" style={{ wordBreak: "break-all" }}>{url}/catalogo</p>
          <div className="actions-cell"><button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button><button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()} disabled={!qr}>Imprimir QR</button></div>
          <p className="field__hint">Pégalo en el mostrador: el cliente ve tus productos y pide su cotización desde el celular.</p>
        </aside>
      </div>
      {qr ? <div className="qr-sheet" aria-hidden="true"><div className="qr-card"><p className="qr-card__table">{data?.profile.shopName}</p><img src={qr} alt="" /><p className="qr-card__hint">Escanea, mira el catálogo y pide tu cotización</p>{data?.profile.phone ? <p className="qr-card__hint">{data.profile.phone}</p> : null}</div></div> : null}
    </div>
  );
}
