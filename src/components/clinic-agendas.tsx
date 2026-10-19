"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, parsePesos } from "@/lib/format";
import { WEEKDAYS, WEEK_ORDER, hhmm, toMin } from "@/lib/clinic";
import type { ClinicAgenda, ClinicProfileData, ClinicServiceItem } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { Dlg, errMsg, useClinicAccess } from "./clinic-common";

const COLORS = ["#2563eb", "#0d9488", "#c026d3", "#ea580c", "#65a30d", "#dc2626", "#7c3aed", "#0891b2"];

async function fileToSignature(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const w = Math.min(360, bmp.width); const h = Math.max(1, Math.round((bmp.height * w) / bmp.width));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return c.toDataURL("image/png");
}

function AgendaDialog({ item, onClose, onDone }: { item: ClinicAgenda | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: item?.name ?? "", kind: item?.kind ?? "especialista", specialty: item?.specialty ?? "", license: item?.license ?? "", color: item?.color ?? COLORS[0], open: hhmm(item?.openMin ?? 480), close: hhmm(item?.closeMin ?? 1080), slot: String(item?.slotMin ?? 30) });
  const [days, setDays] = useState<number[]>((item?.workDays ?? "1,2,3,4,5").split(",").map(Number));
  const [sig, setSig] = useState<string | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try { setSig(await fileToSignature(file)); setErr(null); } catch { setErr("No se pudo leer la imagen."); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre.");
    if (!days.length) return setErr("Elige al menos un día.");
    const body: Record<string, unknown> = { name: f.name.trim(), kind: f.kind, specialty: f.specialty.trim() || null, license: f.license.trim() || null, color: f.color, workDays: days.sort().join(","), openMin: toMin(f.open), closeMin: toMin(f.close), slotMin: Number(f.slot) };
    if (sig !== undefined) body.signature = sig;
    setBusy(true);
    try { if (item) await api(`/clinic/agendas/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }); else await api("/clinic/agendas", { method: "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  const has = sig === undefined ? !!item?.hasSignature : !!sig;
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar agenda" : "Nueva agenda"}</h2>
      <div className="field-row">
        <div className="field"><label htmlFor="ag-n">Nombre</label><input id="ag-n" type="text" maxLength={60} value={f.name} placeholder="Dra. Ana Rojas · Silla 2" autoComplete="off" onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="ag-k">Tipo</label><select id="ag-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "especialista" | "silla" })}><option value="especialista">Doctor / especialista</option><option value="silla">Silla odontológica</option></select></div>
      </div>
      {f.kind === "especialista" ? (
        <>
          <div className="field-row">
            <div className="field"><label htmlFor="ag-s">Especialidad</label><input id="ag-s" type="text" maxLength={60} value={f.specialty} placeholder="Ortodoncia" autoComplete="off" onChange={(e) => setF({ ...f, specialty: e.target.value })} /></div>
            <div className="field"><label htmlFor="ag-l">Registro profesional</label><input id="ag-l" type="text" maxLength={40} value={f.license} autoComplete="off" onChange={(e) => setF({ ...f, license: e.target.value })} /></div>
          </div>
          <div className="field"><label htmlFor="ag-sig">Firma para las recetas (imagen)</label><input id="ag-sig" type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} />
            <p className="field__hint">{has ? "Hay una firma guardada. " : "Aún no hay firma. "}{sig ? <img src={sig} alt="Firma nueva" className="sig-prev" /> : null}{has ? <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setSig(null)}>Quitar firma</button> : null}</p></div>
        </>
      ) : null}
      <div className="field"><span className="label">Días de atención</span><div className="chips" role="group" aria-label="Días">{WEEK_ORDER.map((d) => <button type="button" key={d} className={`chip${days.includes(d) ? " is-on" : ""}`} aria-pressed={days.includes(d)} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>{WEEKDAYS[d]}</button>)}</div></div>
      <div className="field-row">
        <div className="field"><label htmlFor="ag-o">Abre</label><input id="ag-o" type="time" value={f.open} onChange={(e) => setF({ ...f, open: e.target.value })} /></div>
        <div className="field"><label htmlFor="ag-c">Cierra</label><input id="ag-c" type="time" value={f.close} onChange={(e) => setF({ ...f, close: e.target.value })} /></div>
        <div className="field"><label htmlFor="ag-i">Cada (min)</label><input id="ag-i" type="number" min={10} max={120} step={5} value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })} /></div>
      </div>
      <div className="field"><span className="label">Color en la agenda</span><div className="chips" role="group" aria-label="Color">{COLORS.map((c) => <button type="button" key={c} className={`swatch${f.color === c ? " is-on" : ""}`} style={{ background: c }} aria-label={`Color ${c}`} aria-pressed={f.color === c} onClick={() => setF({ ...f, color: c })} />)}</div></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function ServiceDialog({ item, onClose, onDone }: { item: ClinicServiceItem | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [desc, setDesc] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : "");
  const [min, setMin] = useState(String(item?.minutes ?? 30));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const v = parsePesos(price);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Escribe el nombre del servicio.");
    if (price.trim() && (Number.isNaN(v) || v < 1)) return setErr("El precio debe ser un valor en pesos.");
    setBusy(true);
    const body = JSON.stringify({ name: name.trim(), description: desc.trim() || null, price: price.trim() ? v : null, minutes: Number(min) });
    try { if (item) await api(`/clinic/services/${item.id}`, { method: "PATCH", body }); else await api("/clinic/services", { method: "POST", body }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar servicio" : "Nuevo servicio"}</h2>
      <div className="field"><label htmlFor="sv-n">Nombre</label><input id="sv-n" type="text" value={name} placeholder="Limpieza, resina, valoración…" autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="sv-d">Descripción (opcional)</label><input id="sv-d" type="text" value={desc} autoComplete="off" onChange={(e) => setDesc(e.target.value)} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="sv-p">Precio (opcional)</label><input id="sv-p" type="text" inputMode="numeric" value={price} autoComplete="off" onChange={(e) => { setPrice(e.target.value); setErr(null); }} /><p className="field__hint">{price.trim() && !Number.isNaN(v) ? formatMoney(v) : ""}</p></div>
        <div className="field"><label htmlFor="sv-m">Duración (min)</label><input id="sv-m" type="number" min={10} max={480} step={5} value={min} onChange={(e) => setMin(e.target.value)} /></div>
      </div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

export function ClinicAgendasView() {
  const { state, allowed } = useClinicAccess();
  const { data, error, reload } = useResource<ClinicProfileData>(allowed ? "/clinic/profile" : null);
  const [dlg, setDlg] = useState<{ k: "ag"; item: ClinicAgenda | null } | { k: "sv"; item: ClinicServiceItem | null } | { k: "delag" | "delsv"; id: string; name: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const done = () => { setDlg(null); reload(); };
  async function patch(path: string, body: object) { try { await api(path, { method: "PATCH", body: JSON.stringify(body) }); reload(); } catch (x) { setErr(errMsg(x)); } }
  async function del() {
    if (!dlg || (dlg.k !== "delag" && dlg.k !== "delsv")) return;
    try { await api(`/clinic/${dlg.k === "delag" ? "agendas" : "services"}/${dlg.id}`, { method: "DELETE" }); setDlg(null); reload(); } catch (x) { setErr(errMsg(x)); setDlg(null); }
  }
  return (
    <div className="page">
      <div className="page-head"><div><h1>Agendas y servicios</h1><p className="lede">Cada doctor o silla odontológica tiene su propia agenda, que pueden llenar recepción y los pacientes.</p></div></div>
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      <section className="card"><div className="card__head"><h2>Doctores y sillas</h2><button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "ag", item: null })}>Agregar</button></div>
        <div className="table-wrap"><table className="table"><thead><tr><th>Agenda</th><th>Horario</th><th>Activa</th><th></th></tr></thead><tbody>
          {(data?.agendas ?? []).map((a) => (
            <tr key={a.id}><td><i className="dot" style={{ background: a.color }} aria-hidden="true" /> <b>{a.name}</b><br /><span className="field__hint">{a.kind === "silla" ? "Silla odontológica" : [a.specialty, a.license ? `Reg. ${a.license}` : "", a.hasSignature ? "con firma" : "sin firma"].filter(Boolean).join(" · ")}</span></td>
              <td>{a.workDays.split(",").map((d) => WEEKDAYS[Number(d)]).join(", ")}<br /><span className="field__hint">{hhmm(a.openMin)}–{hhmm(a.closeMin)} · cada {a.slotMin} min</span></td>
              <td><button className={`chip ${a.active ? "is-on" : ""}`} aria-pressed={a.active} onClick={() => patch(`/clinic/agendas/${a.id}`, { active: !a.active })}>{a.active ? "Sí" : "No"}</button></td>
              <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "ag", item: a })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delag", id: a.id, name: a.name })}>Quitar</button></td></tr>
          ))}
        </tbody></table></div></section>
      <section className="card"><div className="card__head"><h2>Servicios</h2><button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "sv", item: null })}>Agregar</button></div>
        <div className="table-wrap"><table className="table"><thead><tr><th>Servicio</th><th>Precio</th><th>Duración</th><th>Visible</th><th></th></tr></thead><tbody>
          {(data?.services ?? []).map((s) => (
            <tr key={s.id}><td><b>{s.name}</b>{s.description ? <><br /><span className="field__hint">{s.description}</span></> : null}</td><td>{s.price != null ? formatMoney(s.price) : "—"}</td><td>{s.minutes} min</td>
              <td><button className={`chip ${s.active ? "is-on" : ""}`} aria-pressed={s.active} onClick={() => patch(`/clinic/services/${s.id}`, { active: !s.active })}>{s.active ? "Sí" : "No"}</button></td>
              <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "sv", item: s })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delsv", id: s.id, name: s.name })}>Quitar</button></td></tr>
          ))}
        </tbody></table></div></section>
      <Dlg open={dlg?.k === "ag"} onClose={() => setDlg(null)}>{dlg?.k === "ag" ? <AgendaDialog item={dlg.item} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "sv"} onClose={() => setDlg(null)}>{dlg?.k === "sv" ? <ServiceDialog item={dlg.item} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <ConfirmDialog open={dlg?.k === "delag" || dlg?.k === "delsv"} title="Quitar" message={dlg && (dlg.k === "delag" || dlg.k === "delsv") ? `¿Quitar “${dlg.name}”?` : ""} confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
