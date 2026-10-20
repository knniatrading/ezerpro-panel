"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { todayISO } from "@/lib/format";
import { ASM_KINDS, ASM_STATUS, MINUTES_STATUS, MODES, MODE_TEXT, addDays, coIso, coParts, dateLongCO } from "@/lib/residential";
import type { ResAssemblyRow, ResLive } from "@/lib/residential";
import { NoAccess } from "./no-access";
import { ALL, Dlg, Empty, Err, Pill, errMsg, useResAccess } from "./res-common";

export function AssemblyForm({ item, onClose, onDone }: { item?: ResLive["assembly"]; onClose: () => void; onDone: (id: string) => void }) {
  const p = item ? coParts(item.startsAt) : null;
  const [f, setF] = useState({ title: item?.title ?? "", kind: item?.kind ?? "extraordinaria", date: p?.date ?? addDays(todayISO(), 7), time: p?.time ?? "19:00", mode: item?.mode ?? "mixta", place: item?.place ?? "", link: item?.link ?? "", quorum: String(item?.quorumPct ?? 50), agenda: item ? item.agenda.map((x) => x.title).join("\n") : "Verificación del quórum\nElección de presidente y secretario de la asamblea\nProposiciones y varios" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.title.trim().length < 4) return setErr("Escribe el nombre de la asamblea.");
    const agenda = f.agenda.split("\n").map((x) => x.trim()).filter(Boolean);
    if (!agenda.length) return setErr("Escribe al menos un punto del orden del día.");
    setBusy(true);
    const body = { title: f.title.trim(), kind: f.kind, startsAt: coIso(f.date, f.time), mode: f.mode, place: f.place.trim() || null, link: f.link.trim() || null, agenda, ...(item ? { quorumPct: Number(f.quorum) || 50 } : {}) };
    try { if (item) { await api(`/residential/assemblies/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }); onDone(item.id); } else { const r = await api<{ id: string }>("/residential/assemblies", { method: "POST", body: JSON.stringify(body) }); onDone(r.id); } } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar asamblea" : "Asamblea nueva"}</h2>
      <div className="field"><label htmlFor="as-t">Nombre</label><input id="as-t" type="text" value={f.title} placeholder="Asamblea extraordinaria: obras de fachada" autoComplete="off" onChange={set("title")} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="as-k">Tipo</label><select id="as-k" value={f.kind} onChange={set("kind")}>{ASM_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
        <div className="field"><label htmlFor="as-m">Modalidad</label><select id="as-m" value={f.mode} onChange={set("mode")}>{MODES.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="as-d">Fecha</label><input id="as-d" type="date" value={f.date} min={todayISO()} onChange={set("date")} /></div>
        <div className="field"><label htmlFor="as-h">Hora</label><input id="as-h" type="time" value={f.time} onChange={set("time")} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="as-p">Lugar</label><input id="as-p" type="text" value={f.place} placeholder="Salón comunal" autoComplete="off" onChange={set("place")} /></div>
        <div className="field"><label htmlFor="as-l">Enlace de la reunión virtual</label><input id="as-l" type="url" value={f.link} placeholder="https://meet.google.com/…" autoComplete="off" onChange={set("link")} /></div>
      </div>
      {item ? <div className="field"><label htmlFor="as-q">Quórum requerido (% de los coeficientes)</label><input id="as-q" type="text" inputMode="numeric" value={f.quorum} autoComplete="off" onChange={(e) => setF({ ...f, quorum: e.target.value.replace(/\D/g, "").slice(0, 3) })} /></div> : null}
      <div className="field"><label htmlFor="as-a">Orden del día (un punto por línea)</label><textarea id="as-a" rows={6} value={f.agenda} onChange={set("agenda")} /></div>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : item ? "Guardar" : "Crear asamblea"}</button></div>
    </form>
  );
}

export function ResAssembliesView() {
  const { state, allowed, role } = useResAccess(ALL);
  const canCreate = role !== "CASHIER";
  const list = useResource<ResAssemblyRow[]>(allowed ? "/residential/assemblies" : null);
  const [open, setOpen] = useState(false);
  if (state.status === "in" && !allowed) return <NoAccess />;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Asambleas</h1><p className="lede">Convocatoria, asistencia con quórum en vivo, votación por coeficientes y acta firmada.</p></div>
        {canCreate ? <button className="btn btn--primary btn--sm" onClick={() => setOpen(true)}>Asamblea nueva</button> : null}</div>
      {list.error ? <p className="form-error" role="alert">{list.error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Asamblea</th><th>Fecha</th><th>Estado</th><th>Acta</th><th></th></tr></thead><tbody>
        {(list.data ?? []).map((a) => (
          <tr key={a.id}><td><b><Link href={`/cj-asambleas/${a.id}`}>{a.title}</Link></b><br /><span className="field__hint">{ASM_KINDS.find((k) => k.v === a.kind)?.l ?? a.kind} · {MODE_TEXT[a.mode] ?? a.mode} · {a.motions} votaciones · {a.invites} convocados</span></td>
            <td>{dateLongCO(a.startsAt)}</td><td><Pill tone={ASM_STATUS[a.status]?.tone ?? "info"}>{ASM_STATUS[a.status]?.label ?? a.status}</Pill></td><td>{a.status === "cerrada" ? MINUTES_STATUS[a.minutesStatus] ?? a.minutesStatus : "—"}</td>
            <td className="actions-cell"><Link className="btn btn--secondary btn--sm" href={`/cj-asambleas/${a.id}`}>Abrir</Link></td></tr>
        ))}
      </tbody></table></div>
      {list.data && !list.data.length ? <Empty>Aún no hay asambleas. {canCreate ? "Crea la primera con «Asamblea nueva»." : ""}</Empty> : null}
      <Dlg open={open} onClose={() => setOpen(false)} wide>{open ? <AssemblyForm onClose={() => setOpen(false)} onDone={(id) => { window.location.href = `/cj-asambleas/${id}`; }} /> : null}</Dlg>
    </div>
  );
}
