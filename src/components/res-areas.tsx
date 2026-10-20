"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, todayISO } from "@/lib/format";
import { BOOKING_STATUS, minLabel, addDays, niceDate } from "@/lib/residential";
import type { ResArea, ResBooking } from "@/lib/residential";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { ADMIN_BOARD, Dlg, Empty, Err, Pill, Tabs, UnitSelect, errMsg, useResAccess, useUnitOptions } from "./res-common";

const timeOpts = (a: number, b: number, step = 30) => { const o: number[] = []; for (let m = a; m <= b; m += step) o.push(m); return o; };

function AreaForm({ item, onClose, onDone }: { item: ResArea | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: item?.name ?? "", description: item?.description ?? "", capacity: item?.capacity != null ? String(item.capacity) : "", openMin: item?.openMin ?? 480, closeMin: item?.closeMin ?? 1320, maxHours: String(item?.maxHours ?? 4), fee: item ? String(item.fee) : "0", requiresApproval: item?.requiresApproval ?? false, rules: item?.rules ?? "", active: item?.active ?? true });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre del área.");
    if (f.closeMin <= f.openMin) return setErr("La hora de cierre debe ser después de la de apertura.");
    setBusy(true);
    const body = { name: f.name.trim(), description: f.description.trim() || null, capacity: f.capacity ? Number(f.capacity) : null, openMin: f.openMin, closeMin: f.closeMin, maxHours: Number(f.maxHours) || 4, fee: Number(f.fee.replace(/\D/g, "")) || 0, requiresApproval: f.requiresApproval, rules: f.rules.trim() || null, ...(item ? { active: f.active } : {}) };
    try { await api(item ? `/residential/areas/${item.id}` : "/residential/areas", { method: item ? "PATCH" : "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar área" : "Área común nueva"}</h2>
      <div className="field-row">
        <div className="field"><label htmlFor="ar-n">Nombre</label><input id="ar-n" type="text" value={f.name} placeholder="Zona BBQ" autoComplete="off" onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="ar-c">Aforo (personas)</label><input id="ar-c" type="text" inputMode="numeric" value={f.capacity} autoComplete="off" onChange={(e) => setF({ ...f, capacity: e.target.value.replace(/\D/g, "") })} /></div>
      </div>
      <div className="field"><label htmlFor="ar-d">Descripción</label><input id="ar-d" type="text" value={f.description} autoComplete="off" onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="ar-o">Abre</label><select id="ar-o" value={f.openMin} onChange={(e) => setF({ ...f, openMin: Number(e.target.value) })}>{timeOpts(0, 1380).map((m) => <option key={m} value={m}>{minLabel(m)}</option>)}</select></div>
        <div className="field"><label htmlFor="ar-cl">Cierra</label><select id="ar-cl" value={f.closeMin} onChange={(e) => setF({ ...f, closeMin: Number(e.target.value) })}>{timeOpts(30, 1440).map((m) => <option key={m} value={m}>{minLabel(m === 1440 ? 1439 : m)}</option>)}</select></div>
        <div className="field"><label htmlFor="ar-h">Máximo de horas por reserva</label><input id="ar-h" type="text" inputMode="numeric" value={f.maxHours} autoComplete="off" onChange={(e) => setF({ ...f, maxHours: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></div>
      </div>
      <div className="field"><label htmlFor="ar-f">Valor de la reserva (0 = gratis)</label><input id="ar-f" type="text" inputMode="numeric" value={f.fee} autoComplete="off" onChange={(e) => setF({ ...f, fee: e.target.value.replace(/\D/g, "") })} /><p className="field__hint">Si tiene valor, se carga al estado de cuenta de la unidad al aprobarse.</p></div>
      <div className="field"><label htmlFor="ar-r">Normas de uso</label><textarea id="ar-r" rows={3} maxLength={600} value={f.rules} onChange={(e) => setF({ ...f, rules: e.target.value })} /></div>
      <label className="check"><input type="checkbox" checked={f.requiresApproval} onChange={(e) => setF({ ...f, requiresApproval: e.target.checked })} /> Las reservas necesitan aprobación de la administración</label>
      {item ? <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Área disponible para reservar</label> : null}
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function BookForm({ areas, units, onClose, onDone }: { areas: ResArea[]; units: ReturnType<typeof useUnitOptions>; onClose: () => void; onDone: () => void }) {
  const act = areas.filter((a) => a.active);
  const [f, setF] = useState({ unitId: "", areaId: act[0]?.id ?? "", date: addDays(todayISO(), 1), startMin: 0, hours: "2", guests: "" });
  const area = act.find((a) => a.id === f.areaId);
  const starts = useMemo(() => (area ? timeOpts(area.openMin, area.closeMin - 30) : []), [area]);
  const start = starts.includes(f.startMin) ? f.startMin : starts[0] ?? 0;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.unitId) return setErr("Elige la unidad.");
    if (!area) return setErr("Elige el área.");
    setBusy(true);
    try { await api("/residential/bookings", { method: "POST", body: JSON.stringify({ unitId: f.unitId, areaId: f.areaId, date: f.date, startMin: start, hours: Number(f.hours) || 1, guests: f.guests ? Number(f.guests) : null }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Reservar para una unidad</h2>
      <UnitSelect id="bk-u" value={f.unitId} onChange={(v) => { setF({ ...f, unitId: v }); setErr(null); }} opts={units} />
      <div className="field-row">
        <div className="field"><label htmlFor="bk-a">Área</label><select id="bk-a" value={f.areaId} onChange={(e) => setF({ ...f, areaId: e.target.value })}>{act.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div className="field"><label htmlFor="bk-d">Día</label><input id="bk-d" type="date" min={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="bk-s">Desde</label><select id="bk-s" value={start} onChange={(e) => setF({ ...f, startMin: Number(e.target.value) })}>{starts.map((m) => <option key={m} value={m}>{minLabel(m)}</option>)}</select></div>
        <div className="field"><label htmlFor="bk-h">Horas</label><input id="bk-h" type="text" inputMode="numeric" value={f.hours} autoComplete="off" onChange={(e) => setF({ ...f, hours: e.target.value.replace(/\D/g, "").slice(0, 2) })} />{area ? <span className="field__hint">Máximo {area.maxHours}</span> : null}</div>
        <div className="field"><label htmlFor="bk-g">Invitados</label><input id="bk-g" type="text" inputMode="numeric" value={f.guests} autoComplete="off" onChange={(e) => setF({ ...f, guests: e.target.value.replace(/\D/g, "") })} /></div>
      </div>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Reservando…" : "Reservar"}</button></div>
    </form>
  );
}

export function ResAreasView() {
  const { state, allowed, role } = useResAccess(["TENANT_ADMIN", "EMPLOYEE", "CASHIER"]);
  const admin = role === "TENANT_ADMIN";
  const canDecide = role !== "CASHIER";
  const [tab, setTab] = useState<"bookings" | "areas">("bookings");
  const areas = useResource<ResArea[]>(allowed ? "/residential/areas" : null);
  const [from] = useState(todayISO());
  const bookings = useResource<ResBooking[]>(allowed ? `/residential/bookings?from=${from}&to=${addDays(from, 60)}` : null);
  const units = useUnitOptions(allowed && admin);
  const [dlg, setDlg] = useState<null | "area" | "book" | { area: ResArea } | { del: ResArea } | { cancel: ResBooking }>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const close = () => setDlg(null);
  const done = () => { close(); areas.reload(); bookings.reload(); };
  async function decide(b: ResBooking, action: "aprobar" | "rechazar" | "cancelar") { try { await api(`/residential/bookings/${b.id}/decide`, { method: "POST", body: JSON.stringify({ action }) }); done(); } catch (x) { setErr(errMsg(x)); close(); } }
  async function delArea(a: ResArea) { try { await api(`/residential/areas/${a.id}`, { method: "DELETE" }); done(); } catch (x) { setErr(errMsg(x)); close(); } }
  const list = (bookings.data ?? []).filter((b) => b.status === "aprobada" || b.status === "pendiente");
  void ADMIN_BOARD;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Áreas comunes</h1><p className="lede">Reservas de la zona BBQ, el salón comunal, la piscina y la cancha, sin cruces.</p></div>
        {admin ? <div className="actions-cell"><button className="btn btn--primary btn--sm" onClick={() => setDlg("book")} disabled={!areas.data?.length}>Reservar para una unidad</button><button className="btn btn--secondary btn--sm" onClick={() => setDlg("area")}>Área nueva</button></div> : null}</div>
      <Tabs tabs={[["bookings", `Reservas próximas (${list.length})`], ["areas", `Áreas (${areas.data?.length ?? 0})`]]} value={tab} onChange={setTab} />
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {tab === "bookings" ? (
        <>
          <div className="table-wrap"><table className="table"><thead><tr><th>Cuándo</th><th>Área</th><th>Unidad</th><th>Estado</th><th></th></tr></thead><tbody>
            {list.map((b) => <tr key={b.id}><td><b>{niceDate(b.start)}</b><br />{b.startLabel} – {b.endLabel}{b.guests ? <span className="field__hint"> · {b.guests} invitados</span> : null}</td><td>{b.area}</td><td>{b.unit}</td>
              <td><Pill tone={BOOKING_STATUS[b.status]?.tone ?? "info"}>{BOOKING_STATUS[b.status]?.label ?? b.status}</Pill>{b.fee ? <span className="field__hint"> · con cobro</span> : null}</td>
              <td className="actions-cell">{canDecide && b.status === "pendiente" ? <><button className="btn btn--primary btn--sm" onClick={() => decide(b, "aprobar")}>Aprobar</button><button className="btn btn--secondary btn--sm" onClick={() => decide(b, "rechazar")}>Rechazar</button></> : null}{canDecide && b.status === "aprobada" ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ cancel: b })}>Cancelar</button> : null}</td></tr>)}
          </tbody></table></div>
          {bookings.data && !list.length ? <Empty>No hay reservas en los próximos 60 días.</Empty> : null}
        </>
      ) : (
        <div className="vet-grid">
          {(areas.data ?? []).map((a) => (
            <section key={a.id} className="dcard__sec"><h2>{a.name} {!a.active ? <Pill tone="info">Cerrada</Pill> : null}</h2>
              <p>{a.description}</p><p className="field__hint">{minLabel(a.openMin)} – {minLabel(a.closeMin >= 1440 ? 1439 : a.closeMin)} · máx. {a.maxHours} h{a.capacity ? ` · aforo ${a.capacity}` : ""} · {a.fee ? formatMoney(a.fee) : "gratis"}{a.requiresApproval ? " · con aprobación" : ""}</p>
              {admin ? <div className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ area: a })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ del: a })}>Eliminar</button></div> : null}
            </section>
          ))}
          {areas.data && !areas.data.length ? <Empty>Aún no hay áreas. Crea la primera con «Área nueva».</Empty> : null}
        </div>
      )}
      <Dlg open={dlg === "area" || (typeof dlg === "object" && dlg !== null && "area" in dlg)} onClose={close}>{dlg === "area" ? <AreaForm item={null} onClose={close} onDone={done} /> : typeof dlg === "object" && dlg && "area" in dlg ? <AreaForm item={dlg.area} onClose={close} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg === "book"} onClose={close}>{dlg === "book" ? <BookForm areas={areas.data ?? []} units={units} onClose={close} onDone={done} /> : null}</Dlg>
      <ConfirmDialog open={typeof dlg === "object" && dlg !== null && "del" in dlg} title="Eliminar área" message="¿Eliminar esta área? Si tiene reservas, mejor ciérrala editándola." confirmLabel="Sí, eliminar" onConfirm={() => (typeof dlg === "object" && dlg && "del" in dlg ? delArea(dlg.del) : undefined)} onClose={close} />
      <ConfirmDialog open={typeof dlg === "object" && dlg !== null && "cancel" in dlg} title="Cancelar reserva" message="¿Cancelar esta reserva? Si tenía cobro, se anula." confirmLabel="Sí, cancelar" onConfirm={() => (typeof dlg === "object" && dlg && "cancel" in dlg ? decide(dlg.cancel, "cancelar") : undefined)} onClose={close} />
    </div>
  );
}
