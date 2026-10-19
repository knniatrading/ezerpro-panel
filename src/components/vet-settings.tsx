"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { tenantOrigin } from "@/lib/tenant-url";
import { DAYS, hourLabel } from "@/lib/vet";
import type { VetProfileData } from "@/lib/types";
import { NoAccess } from "./no-access";
import { useVetAccess } from "./vet-common";

export function VetSettingsView() {
  const { state, allowed } = useVetAccess();
  const { data, error, reload } = useResource<VetProfileData>(allowed ? "/vet/profile" : null);
  const [f, setF] = useState({ clinicName: "", phone: "", address: "", bio: "", openHour: 8, closeHour: 18, slotMinutes: 30, capacity: 1, reminderDays: 3 });
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = data?.host ? tenantOrigin(data.host) : "";

  useEffect(() => {
    const p = data?.profile;
    if (!p) return;
    setF({ clinicName: p.clinicName, phone: p.phone ?? "", address: p.address ?? "", bio: p.bio ?? "", openHour: p.openHour, closeHour: p.closeHour, slotMinutes: p.slotMinutes, capacity: p.capacity, reminderDays: p.reminderDays });
    setDays(p.workDays.split(",").map(Number));
  }, [data]);
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 600, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [url]);

  if (state.status === "in" && !allowed) return <NoAccess />;
  const touch = () => { setOk(false); setErr(null); };
  const text = (k: "clinicName" | "phone" | "address" | "bio") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); touch(); };
  const num = (k: "openHour" | "closeHour" | "slotMinutes" | "capacity" | "reminderDays") => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => { setF({ ...f, [k]: Number(e.target.value) }); touch(); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(false);
    try {
      await api("/vet/profile", { method: "PATCH", body: JSON.stringify({ ...f, phone: f.phone.trim() || null, address: f.address.trim() || null, bio: f.bio.trim() || null, workDays: days.join(",") }) });
      setOk(true); reload();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setErr("No se pudo copiar. Selecciona el enlace y cópialo."); }
  }
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="page">
      <div className="page-head no-print"><div><h1>Mi clínica y QR</h1><p className="lede">Estos datos salen en tu página pública. El horario define los turnos que ven tus clientes al pedir cita.</p></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="card-admin no-print">
        <form onSubmit={save} noValidate className="card-admin__form">
          <div className="field"><label htmlFor="vc-name">Nombre de la clínica</label><input id="vc-name" type="text" value={f.clinicName} autoComplete="off" onChange={text("clinicName")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="vc-phone">Celular (llamadas y WhatsApp)</label><input id="vc-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={text("phone")} /></div>
            <div className="field"><label htmlFor="vc-addr">Dirección</label><input id="vc-addr" type="text" value={f.address} autoComplete="off" onChange={text("address")} /></div>
          </div>
          <div className="field"><label htmlFor="vc-bio">Presentación</label><textarea id="vc-bio" rows={3} maxLength={400} value={f.bio} onChange={text("bio")} /></div>
          <fieldset className="field"><legend>Días de atención</legend>
            <div className="chips">{DAYS.map((d) => (
              <button type="button" key={d.n} className={days.includes(d.n) ? "is-on" : ""} aria-pressed={days.includes(d.n)} onClick={() => { setDays(days.includes(d.n) ? days.filter((x) => x !== d.n) : [...days, d.n]); touch(); }}>{d.label}</button>
            ))}</div>
          </fieldset>
          <div className="field-row">
            <div className="field"><label htmlFor="vc-open">Abres a las</label><select id="vc-open" value={f.openHour} onChange={num("openHour")}>{hours.filter((h) => h < 24).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select></div>
            <div className="field"><label htmlFor="vc-close">Cierras a las</label><select id="vc-close" value={f.closeHour} onChange={num("closeHour")}>{hours.slice(1).concat(24).map((h) => <option key={h} value={h}>{hourLabel(h === 24 ? 24 : h)}</option>)}</select></div>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="vc-slot">Turnos cada</label><select id="vc-slot" value={f.slotMinutes} onChange={num("slotMinutes")}>{[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutos</option>)}</select></div>
            <div className="field"><label htmlFor="vc-cap">Citas al mismo tiempo</label><input id="vc-cap" type="number" min={1} max={20} value={f.capacity} onChange={num("capacity")} /><p className="field__hint">Según cuántos veterinarios o mesas tengas.</p></div>
            <div className="field"><label htmlFor="vc-rem">Avisar con (días)</label><input id="vc-rem" type="number" min={0} max={30} value={f.reminderDays} onChange={num("reminderDays")} /><p className="field__hint">Días antes de vacunas y cuidados.</p></div>
          </div>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          {ok ? <p className="note" role="status">Datos guardados.</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </form>
        <aside className="card-admin__qr">
          <h2 className="section-title">QR de tu clínica</h2>
          {qr ? <img src={qr} alt="Código QR de la página de tu clínica" width={220} height={220} /> : <p className="lede">Generando…</p>}
          <p className="field__hint" style={{ wordBreak: "break-all" }}>{url}</p>
          <div className="actions-cell">
            <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()} disabled={!qr}>Imprimir QR</button>
          </div>
          <p className="field__hint">Pégalo en la entrada y el mostrador: tus clientes piden citas y ven la tienda desde su celular.</p>
        </aside>
      </div>
      {qr ? (
        <div className="qr-sheet" aria-hidden="true">
          <div className="qr-card">
            <p className="qr-card__table">{data?.profile.clinicName}</p>
            <img src={qr} alt="" />
            <p className="qr-card__hint">Escanea para pedir tu cita y ver nuestra tienda</p>
            {data?.profile.phone ? <p className="qr-card__hint">{data.profile.phone}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
