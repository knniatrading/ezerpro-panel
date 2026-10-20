"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useSession } from "./session";
import { STATUS_TEXT, durationLabel, todayCO, METHOD_TEXT, niceDate, timeCO } from "@/lib/salon";
import type { SalonAppt, SalonClientRow, SalonProfileData, SalonSaleDetail, SalonStatus } from "@/lib/types";
export { errMsg, Dlg } from "./clinic-common";
import { errMsg } from "./clinic-common";

export const ADMIN = ["TENANT_ADMIN"];
export const FRONT = ["TENANT_ADMIN", "CASHIER"];
export const ALL = ["TENANT_ADMIN", "CASHIER", "EMPLOYEE"];

export function useSalonAccess(roles: string[] = ALL) {
  const { state } = useSession();
  const allowed = state.status === "in" && roles.includes(state.user.role) && !!state.user.tenant?.modules?.includes("belleza");
  return { state, allowed, role: state.status === "in" ? state.user.role : "" };
}

export function SalonBadge({ status }: { status: SalonStatus }) {
  const s = STATUS_TEXT[status] ?? { label: status, tone: "info" as const };
  return <span className={`badge badge--${s.tone}`}>{s.label}</span>;
}

/** Los profesionales que pueden hacer todos los servicios elegidos. */
export function staffFor(cfg: SalonProfileData, serviceIds: string[]) {
  const svcs = cfg.services.filter((s) => serviceIds.includes(s.id));
  return cfg.staff.filter((st) => st.active && svcs.every((s) => !s.staffIds || s.staffIds.split(",").includes(st.id)));
}

/** Buscador de cliente con opción de crear uno nuevo en el momento. */
export function ClientPicker({ value, onPick }: { value: { id: string; name: string } | null; onPick: (p: { id: string; name: string } | null) => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<SalonClientRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setList([]); return; }
    const h = setTimeout(() => { api<SalonClientRow[]>(`/salon/clients?q=${encodeURIComponent(q.trim())}`).then((r) => setList(r.slice(0, 6))).catch(() => setList([])); }, 250);
    return () => clearTimeout(h);
  }, [q]);
  async function create() {
    setErr(null);
    try {
      const p = await api<{ id: string; name: string }>("/salon/clients", { method: "POST", body: JSON.stringify({ name: name.trim(), phone: phone.trim() }) });
      onPick({ id: p.id, name: p.name });
    } catch (x) { setErr(errMsg(x)); }
  }
  if (value) return <div className="field"><span className="label">Cliente</span><div className="pick-chip"><b>{value.name}</b><button type="button" className="btn btn--secondary btn--sm" onClick={() => onPick(null)}>Cambiar</button></div></div>;
  return (
    <div className="field">
      <label htmlFor="cp-q">Cliente</label>
      {!creating ? (
        <>
          <input id="cp-q" type="text" value={q} placeholder="Busca por nombre o celular" autoComplete="off" onChange={(e) => setQ(e.target.value)} />
          {list.length ? <ul className="pick-list">{list.map((p) => <li key={p.id}><button type="button" onClick={() => onPick({ id: p.id, name: p.name })}>{p.name}<span className="field__hint"> · {p.phone}</span>{p.allergies ? <span className="badge badge--warn"> ⚠ alergia</span> : null}</button></li>)}</ul> : q.trim().length >= 2 ? <p className="field__hint">Sin resultados.</p> : null}
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setCreating(true)}>Cliente nuevo</button>
        </>
      ) : (
        <div className="pick-new">
          <input type="text" aria-label="Nombre completo" value={name} placeholder="Nombre completo" autoComplete="off" onChange={(e) => setName(e.target.value)} />
          <input type="text" aria-label="Celular" inputMode="tel" value={phone} placeholder="Celular" autoComplete="off" onChange={(e) => setPhone(e.target.value)} />
          {err ? <p className="form-error" role="alert">{err}</p> : null}
          <div className="actions-cell"><button type="button" className="btn btn--primary btn--sm" onClick={create}>Crear y elegir</button><button type="button" className="btn btn--secondary btn--sm" onClick={() => setCreating(false)}>Buscar</button></div>
        </div>
      )}
    </div>
  );
}

/** Nueva cita (uno o varios servicios) o reprogramación. */
export function ApptDialog({ cfg, client, date, staffId, move, onClose, onDone }: {
  cfg: SalonProfileData; client?: { id: string; name: string } | null; date?: string; staffId?: string; move?: SalonAppt | null; onClose: () => void; onDone: () => void;
}) {
  const mine = cfg.myStaffId;
  const services = cfg.services.filter((s) => s.active);
  const [c, setC] = useState<{ id: string; name: string } | null>(client ?? (move ? { id: move.clientId, name: move.clientName } : null));
  const [sel, setSel] = useState<string[]>(move ? move.services.map((s) => s.id) : []);
  const staffOpts = useMemo(() => (move ? cfg.staff.filter((s) => s.active) : staffFor(cfg, sel)), [cfg, sel, move]);
  const [st, setSt] = useState(move?.staffId ?? mine ?? staffId ?? "");
  const [day, setDay] = useState(date ?? todayCO());
  const [slots, setSlots] = useState<{ start: string; label: string }[] | null>(null);
  const [start, setStart] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const minutes = services.filter((s) => sel.includes(s.id)).reduce((t, s) => t + s.minutes, 0);
  const total = services.filter((s) => sel.includes(s.id)).reduce((t, s) => t + s.price, 0);
  const staffOk = !!st && staffOpts.some((s) => s.id === st);
  useEffect(() => { if (!staffOk) setSt(mine ?? staffOpts[0]?.id ?? ""); }, [staffOk, staffOpts, mine]);
  useEffect(() => {
    if (!st || !day || !sel.length || !staffOk) { setSlots(null); return; }
    let off = false;
    setSlots(null); setStart("");
    api<{ slots: { start: string; label: string }[] }>(`/salon/slots?staffId=${st}&date=${day}&serviceIds=${sel.join(",")}${move ? `&exclude=${move.id}` : ""}`).then((r) => { if (!off) setSlots(r.slots); }).catch(() => { if (!off) setSlots([]); });
    return () => { off = true; };
  }, [st, day, sel, move, staffOk]);
  const toggle = (id: string) => setSel((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!c) return setErr("Elige el cliente.");
    if (!sel.length) return setErr("Elige al menos un servicio.");
    if (!start) return setErr("Elige un horario.");
    setBusy(true);
    try {
      if (move) await api(`/salon/appointments/${move.id}`, { method: "PATCH", body: JSON.stringify({ start, staffId: st }) });
      else await api("/salon/appointments", { method: "POST", body: JSON.stringify({ clientId: c.id, staffId: st, serviceIds: sel, start, notes: notes.trim() || null }) });
      onDone();
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  const groups = [...new Set(services.map((s) => s.category ?? "Otros"))];
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{move ? "Reprogramar cita" : "Nueva cita"}</h2>
      {move ? <p className="lede">{move.clientName} · {move.services.map((s) => s.name).join(", ")}</p> : <>
        <ClientPicker value={c} onPick={setC} />
        <fieldset className="field"><legend>Servicios</legend>
          {groups.map((g) => (
            <div key={g}><p className="field__hint"><b>{g}</b></p>
              <div className="chips">{services.filter((s) => (s.category ?? "Otros") === g).map((s) => <button type="button" key={s.id} className={sel.includes(s.id) ? "is-on" : ""} aria-pressed={sel.includes(s.id)} onClick={() => { toggle(s.id); setErr(null); }}>{s.name} · {durationLabel(s.minutes)}</button>)}</div></div>
          ))}
          {sel.length ? <p className="field__hint">Duración total: {durationLabel(minutes)} · {formatMoney(total)}</p> : null}
        </fieldset></>}
      <div className="field-row">
        <div className="field"><label htmlFor="sa-st">Con quién</label><select id="sa-st" value={st} disabled={!!mine} onChange={(e) => setSt(e.target.value)}>{!staffOpts.length ? <option value="">Elige servicios</option> : null}{staffOpts.map((s) => <option key={s.id} value={s.id}>{s.name}{s.title ? ` · ${s.title}` : ""}</option>)}</select></div>
        <div className="field"><label htmlFor="sa-day">Fecha</label><input id="sa-day" type="date" min={todayCO()} value={day} onChange={(e) => setDay(e.target.value)} /></div>
      </div>
      <div className="field"><span className="label">Horario</span>
        {!sel.length ? <p className="field__hint">Elige primero los servicios.</p> : slots === null ? <p className="field__hint">Buscando horarios…</p> : slots.length ? <div className="chips" role="group" aria-label="Horarios disponibles">{slots.map((s) => <button type="button" key={s.start} className={start === s.start ? "is-on" : ""} aria-pressed={start === s.start} onClick={() => { setStart(s.start); setErr(null); }}>{s.label}</button>)}</div> : <p className="field__hint">No hay horarios libres ese día con esa duración.</p>}
      </div>
      {!move ? <div className="field"><label htmlFor="sa-n">Nota (opcional)</label><input id="sa-n" type="text" maxLength={300} value={notes} autoComplete="off" onChange={(e) => setNotes(e.target.value)} /></div> : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : move ? "Reprogramar" : "Agendar"}</button></div>
    </form>
  );
}

const dt = (iso: string) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Recibo para imprimir (tirilla): solo se ve al imprimir. */
export function SalonReceipt({ detail }: { detail: SalonSaleDetail }) {
  const { sale: s, salon } = detail;
  return (
    <div className="fe-print" aria-hidden="true">
      <div className="fe-ticket">
        <p className="fe-ticket__name">{salon.name}</p>
        {salon.address ? <p>{salon.address}</p> : null}
        {salon.phone ? <p>Tel. {salon.phone}</p> : null}
        <p className="fe-ticket__rule">Venta #{s.number} · {dt(s.createdAt)}</p>
        {s.clientName ? <p>Cliente: {s.clientName}</p> : null}
        <table><tbody>
          {s.items.filter((i) => i.kind !== "propina").map((i) => <tr key={i.id}><td>{i.qty > 1 ? `${i.qty} × ` : ""}{i.name}{i.staffName ? <><br /><small>{i.staffName}</small></> : null}</td><td>{formatMoney(i.total)}</td></tr>)}
        </tbody></table>
        <p className="fe-ticket__rule" />
        {s.discount ? <p className="fe-ticket__row"><span>Subtotal</span><span>{formatMoney(s.subtotal)}</span></p> : null}
        {s.discount ? <p className="fe-ticket__row"><span>Descuento</span><span>-{formatMoney(s.discount)}</span></p> : null}
        {s.tip ? <p className="fe-ticket__row"><span>Propina</span><span>{formatMoney(s.tip)}</span></p> : null}
        <p className="fe-ticket__row fe-ticket__total"><span>TOTAL</span><span>{formatMoney(s.total)}</span></p>
        <p className="fe-ticket__row"><span>Pago</span><span>{METHOD_TEXT[s.method] ?? s.method}</span></p>
        <p className="fe-ticket__rule">Atendió: {s.createdByName ?? "—"}</p>
        <p>¡Gracias por visitarnos!</p>
      </div>
    </div>
  );
}
export { niceDate, timeCO };
