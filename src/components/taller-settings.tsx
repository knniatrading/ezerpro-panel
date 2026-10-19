"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { tenantOrigin } from "@/lib/tenant-url";
import type { TallerProfileData, TallerType } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ConfirmDialog } from "./confirm-dialog";
import { Dlg, errMsg, useTallerAccess } from "./taller-common";

function TypeDialog({ item, onClose, onDone }: { item: TallerType | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [months, setMonths] = useState(String(item?.months ?? 6));
  const [km, setKm] = useState(item?.km ? String(item.km) : "");
  const [active, setActive] = useState(item?.active ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const body = { name: name.trim(), months: Number(months), km: km ? Number(km) : null, ...(item ? { active } : {}) };
    try { if (item) await api(`/taller/service-types/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }); else await api("/taller/service-types", { method: "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar servicio" : "Nuevo servicio con recordatorio"}</h2>
      <div className="field"><label htmlFor="ty-n">Nombre</label><input id="ty-n" type="text" maxLength={60} value={name} placeholder="Ej.: Cambio de aceite" autoComplete="off" onChange={(e) => setName(e.target.value)} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="ty-m">Avisar cada (meses)</label><input id="ty-m" type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value)} /></div>
        <div className="field"><label htmlFor="ty-k">O cada (kilómetros, opcional)</label><input id="ty-k" type="number" min={500} value={km} placeholder="Ej.: 5000" onChange={(e) => setKm(e.target.value)} /></div>
      </div>
      {item ? <label className="check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Activo</label> : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

export function TallerSettingsView() {
  const { state, allowed } = useTallerAccess();
  const { data, error, reload } = useResource<TallerProfileData>(allowed ? "/taller/profile" : null);
  const [f, setF] = useState({ workshopName: "", phone: "", address: "", bio: "", reminders: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ty, setTy] = useState<TallerType | "new" | null>(null);
  const [del, setDel] = useState<TallerType | null>(null);
  const url = data?.host ? tenantOrigin(data.host) : "";
  useEffect(() => { const p = data?.profile; if (p) setF({ workshopName: p.workshopName, phone: p.phone ?? "", address: p.address ?? "", bio: p.bio ?? "", reminders: p.reminders }); }, [data]);
  useEffect(() => { if (url) QRCode.toDataURL(url, { width: 600, margin: 1 }).then(setQr).catch(() => setQr(null)); }, [url]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const touch = () => { setOk(false); setErr(null); };
  const text = (k: "workshopName" | "phone" | "address" | "bio") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); touch(); };
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null); setOk(false);
    try { await api("/taller/profile", { method: "PATCH", body: JSON.stringify({ ...f, phone: f.phone.trim() || null, address: f.address.trim() || null, bio: f.bio.trim() || null }) }); setOk(true); reload(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setErr("No se pudo copiar. Selecciona el enlace y cópialo."); } }
  return (
    <div className="page">
      <div className="page-head no-print"><div><h1>Mi taller y QR</h1><p className="lede">Estos datos salen en tu página pública, en los correos y en el seguimiento que ve el cliente.</p></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="card-admin no-print">
        <form onSubmit={save} noValidate className="card-admin__form">
          <div className="field"><label htmlFor="ts-name">Nombre del taller</label><input id="ts-name" type="text" value={f.workshopName} autoComplete="off" onChange={text("workshopName")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="ts-phone">Celular (llamadas y WhatsApp)</label><input id="ts-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={text("phone")} /></div>
            <div className="field"><label htmlFor="ts-addr">Dirección</label><input id="ts-addr" type="text" value={f.address} autoComplete="off" onChange={text("address")} /></div>
          </div>
          <div className="field"><label htmlFor="ts-bio">Presentación</label><textarea id="ts-bio" rows={3} maxLength={400} value={f.bio} onChange={text("bio")} /></div>
          <label className="check"><input type="checkbox" checked={f.reminders} onChange={(e) => { setF({ ...f, reminders: e.target.checked }); touch(); }} /> Enviar recordatorios de mantenimiento por correo (7 días antes)</label>
          <p className="field__hint">Solo le llega a los clientes que tienen correo registrado. Siempre puedes avisar por WhatsApp desde “Recordatorios”.</p>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          {ok ? <p className="note" role="status">Datos guardados.</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </form>
        <aside className="card-admin__qr">
          <h2 className="section-title">QR de tu taller</h2>
          {qr ? <img src={qr} alt="Código QR de la página de tu taller" width={220} height={220} /> : <p className="lede">Generando…</p>}
          <p className="field__hint" style={{ wordBreak: "break-all" }}>{url}</p>
          <div className="actions-cell"><button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button><button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()} disabled={!qr}>Imprimir QR</button></div>
          <p className="field__hint">Pégalo en la recepción: el cliente lo escanea y sigue su vehículo con su placa.</p>
        </aside>
      </div>
      <section className="card no-print" aria-label="Servicios con recordatorio" style={{ marginTop: 24 }}>
        <div className="page-head"><div><h2>Servicios con recordatorio</h2><p className="field__hint">Al entregar un vehículo con uno de estos servicios, el sistema programa el próximo aviso (por ejemplo, el cambio de aceite a los 6 meses o a cierto kilometraje).</p></div><button className="btn btn--secondary btn--sm" onClick={() => setTy("new")}>Nuevo servicio</button></div>
        <div className="table-wrap"><table className="table"><thead><tr><th>Servicio</th><th>Avisar cada</th><th></th></tr></thead><tbody>
          {(data?.types ?? []).map((t) => <tr key={t.id} className={t.active ? "" : "is-off"}><td><b>{t.name}</b>{!t.active ? <> <span className="badge badge--info">Inactivo</span></> : null}</td><td>{t.months} {t.months === 1 ? "mes" : "meses"}{t.km ? ` o ${t.km.toLocaleString("es-CO")} km` : ""}</td><td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setTy(t)}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDel(t)}>Eliminar</button></td></tr>)}
        </tbody></table></div>
      </section>
      {qr ? <div className="qr-sheet" aria-hidden="true"><div className="qr-card"><p className="qr-card__table">{data?.profile.workshopName}</p><img src={qr} alt="" /><p className="qr-card__hint">Escanea para seguir tu vehículo y pedir tu cita</p>{data?.profile.phone ? <p className="qr-card__hint">{data.profile.phone}</p> : null}</div></div> : null}
      <Dlg open={ty !== null} onClose={() => setTy(null)}>{ty !== null ? <TypeDialog item={ty === "new" ? null : ty} onClose={() => setTy(null)} onDone={() => { setTy(null); reload(); }} /> : null}</Dlg>
      <ConfirmDialog open={!!del} title="Eliminar servicio" message="Los ítems de órdenes anteriores no se pierden, solo dejan de programar avisos." confirmLabel="Eliminar" onConfirm={async () => { const t = del!; setDel(null); try { await api(`/taller/service-types/${t.id}`, { method: "DELETE" }); reload(); } catch (x) { setErr(errMsg(x)); } }} onClose={() => setDel(null)} />
    </div>
  );
}
