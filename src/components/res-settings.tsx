"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { tenantOrigin } from "@/lib/tenant-url";
import type { ResProfile } from "@/lib/residential";
import { NoAccess } from "./no-access";
import { ADMIN, CopyBtn, Err, QrImg, errMsg, useResAccess } from "./res-common";

export function ResSettingsView() {
  const { state, allowed } = useResAccess(ADMIN);
  const { data, error, reload } = useResource<ResProfile>(allowed ? "/residential/profile" : null);
  const [f, setF] = useState({ name: "", nit: "", address: "", phone: "", adminName: "", feeDueDay: "10", quorumPct: "50", reminders: true, blockDebtorsVote: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  useEffect(() => { const p = data?.profile; if (p) setF({ name: p.name, nit: p.nit ?? "", address: p.address ?? "", phone: p.phone ?? "", adminName: p.adminName ?? "", feeDueDay: String(p.feeDueDay), quorumPct: String(p.quorumPct), reminders: p.reminders, blockDebtorsVote: p.blockDebtorsVote }); }, [data]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const origin = data?.host ? tenantOrigin(data.host) : "";
  const touch = () => { setOk(false); setErr(null); };
  const text = (k: "name" | "nit" | "address" | "phone" | "adminName") => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); touch(); };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 3) return setErr("Escribe el nombre del conjunto.");
    const due = Number(f.feeDueDay), q = Number(f.quorumPct);
    if (!(due >= 1 && due <= 28)) return setErr("El día de vencimiento va del 1 al 28.");
    if (!(q >= 1 && q <= 100)) return setErr("El quórum va de 1 a 100 %.");
    setBusy(true); setErr(null); setOk(false);
    try { await api("/residential/profile", { method: "PATCH", body: JSON.stringify({ name: f.name.trim(), nit: f.nit.trim() || null, address: f.address.trim() || null, phone: f.phone.trim() || null, adminName: f.adminName.trim() || null, feeDueDay: due, quorumPct: q, reminders: f.reminders, blockDebtorsVote: f.blockDebtorsVote }) }); setOk(true); reload(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  return (
    <div className="page">
      <div className="page-head no-print"><div><h1>Mi conjunto</h1><p className="lede">Estos datos salen en el portal, los correos, las convocatorias y el acta de las asambleas.</p></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="card-admin">
        <form onSubmit={save} noValidate className="card-admin__form no-print">
          <div className="field"><label htmlFor="rs-n">Nombre del conjunto</label><input id="rs-n" type="text" value={f.name} autoComplete="off" onChange={text("name")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="rs-nit">NIT</label><input id="rs-nit" type="text" value={f.nit} autoComplete="off" onChange={text("nit")} /></div>
            <div className="field"><label htmlFor="rs-ph">Teléfono de la administración</label><input id="rs-ph" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={text("phone")} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="rs-ad">Dirección</label><input id="rs-ad" type="text" value={f.address} autoComplete="off" onChange={text("address")} /></div>
            <div className="field"><label htmlFor="rs-adm">Administrador(a)</label><input id="rs-adm" type="text" value={f.adminName} autoComplete="off" onChange={text("adminName")} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="rs-due">Día de vencimiento de la cuota (1–28)</label><input id="rs-due" type="text" inputMode="numeric" value={f.feeDueDay} autoComplete="off" onChange={(e) => { setF({ ...f, feeDueDay: e.target.value.replace(/\D/g, "").slice(0, 2) }); touch(); }} /></div>
            <div className="field"><label htmlFor="rs-q">Quórum de las asambleas (% de coeficientes)</label><input id="rs-q" type="text" inputMode="numeric" value={f.quorumPct} autoComplete="off" onChange={(e) => { setF({ ...f, quorumPct: e.target.value.replace(/\D/g, "").slice(0, 3) }); touch(); }} /></div>
          </div>
          <label className="check"><input type="checkbox" checked={f.reminders} onChange={(e) => { setF({ ...f, reminders: e.target.checked }); touch(); }} /> Enviar cada semana un recordatorio de pago por correo a los propietarios con cuotas vencidas</label>
          <label className="check"><input type="checkbox" checked={f.blockDebtorsVote} onChange={(e) => { setF({ ...f, blockDebtorsVote: e.target.checked }); touch(); }} /> Las unidades en mora no votan en las asambleas</label>
          <p className="field__hint">Revisa que tu reglamento de propiedad horizontal permita restringir el voto de morosos; es lo habitual, pero la decisión es del conjunto.</p>
          <Err msg={err} />{ok ? <p className="note" role="status">Datos guardados.</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </form>
        {origin ? (
          <aside className="card-admin__qr">
            <h2 className="section-title">QR del portal</h2>
            <QrImg value={origin} size={180} label="Código QR de la página del conjunto" />
            <p className="field__hint" style={{ wordBreak: "break-all" }}>{origin}</p>
            <div className="actions-cell"><CopyBtn text={origin} /><button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()}>Imprimir</button></div>
            <p className="field__hint">Pégalo en el ascensor o la portería: los residentes entran a la página del conjunto. Cada uno recibe además su enlace personal desde «Unidades y propietarios».</p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
