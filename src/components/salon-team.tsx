"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { WEEKDAYS, WEEK_ORDER, durationLabel, hhmm, toMin } from "@/lib/salon";
import type { Employee, SalonProfileData, SalonServiceRow, SalonStaffRow } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { NumInput } from "./taller-common";
import { ADMIN, Dlg, errMsg, useSalonAccess } from "./salon-common";

const COLORS = ["#be185d", "#1d4ed8", "#7c3aed", "#0d9488", "#ea580c", "#65a30d", "#dc2626", "#0891b2"];

function StaffForm({ item, onClose, onDone }: { item: SalonStaffRow | null; onClose: () => void; onDone: () => void }) {
  const users = useResource<Employee[]>("/employees");
  const [f, setF] = useState({ name: item?.name ?? "", title: item?.title ?? "", color: item?.color ?? COLORS[0], open: hhmm(item?.openMin ?? 540), close: hhmm(item?.closeMin ?? 1080), slot: String(item?.slotMin ?? 30), commissionPct: String(item?.commissionPct ?? 40), productPct: String(item?.productPct ?? 10), userId: item?.userId ?? "", active: item?.active ?? true });
  const [days, setDays] = useState<number[]>((item?.workDays ?? "1,2,3,4,5,6").split(",").map(Number));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre.");
    if (!days.length) return setErr("Elige al menos un día.");
    const body = { name: f.name.trim(), title: f.title.trim() || null, color: f.color, workDays: [...days].sort().join(","), openMin: toMin(f.open), closeMin: toMin(f.close), slotMin: Number(f.slot), commissionPct: Number(f.commissionPct), productPct: Number(f.productPct), userId: f.userId || null, active: f.active };
    setBusy(true);
    try { await api(item ? `/salon/staff/${item.id}` : "/salon/staff", { method: item ? "PATCH" : "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  const linkable = (users.data ?? []).filter((u) => u.role === "EMPLOYEE" || u.role === "CASHIER" || u.role === "TENANT_ADMIN");
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar profesional" : "Nuevo profesional"}</h2>
      <div className="field-row">
        <div className="field"><label htmlFor="st-n">Nombre</label><input id="st-n" type="text" maxLength={60} value={f.name} autoComplete="off" onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="st-t">Cargo</label><input id="st-t" type="text" maxLength={60} value={f.title} placeholder="Estilista, barbero, manicurista…" autoComplete="off" onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      </div>
      <fieldset className="field"><legend>Días que atiende</legend><div className="chips">{WEEK_ORDER.map((d) => <button type="button" key={d} className={days.includes(d) ? "is-on" : ""} aria-pressed={days.includes(d)} onClick={() => setDays((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d]))}>{WEEKDAYS[d]}</button>)}</div></fieldset>
      <div className="field-row">
        <div className="field"><label htmlFor="st-o">Entra</label><input id="st-o" type="time" value={f.open} onChange={(e) => setF({ ...f, open: e.target.value })} /></div>
        <div className="field"><label htmlFor="st-c">Sale</label><input id="st-c" type="time" value={f.close} onChange={(e) => setF({ ...f, close: e.target.value })} /></div>
        <div className="field"><label htmlFor="st-s">Citas cada</label><select id="st-s" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })}>{[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="st-cm">Comisión por servicios (%)</label><NumInput id="st-cm" value={f.commissionPct} onChange={(v) => setF({ ...f, commissionPct: v })} /></div>
        <div className="field"><label htmlFor="st-pm">Comisión por productos (%)</label><NumInput id="st-pm" value={f.productPct} onChange={(v) => setF({ ...f, productPct: v })} /></div>
      </div>
      <p className="field__hint">La comisión se calcula sola en cada venta, sobre lo que realmente se cobró (después del descuento). Un servicio puede tener su propio porcentaje.</p>
      <div className="field"><label htmlFor="st-u">Usuario de acceso (opcional)</label><select id="st-u" value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })}><option value="">Sin usuario</option>{linkable.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}</select>
        <p className="field__hint">Si lo vinculas, esa persona entra al panel y ve solo su agenda, sus clientes y sus comisiones. Crea el usuario en «Equipo» con el rol Estilista.</p></div>
      {item ? <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Activo (aparece en la agenda y en las reservas)</label> : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function ServiceForm({ item, staff, categories, onClose, onDone }: { item: SalonServiceRow | null; staff: SalonStaffRow[]; categories: string[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: item?.name ?? "", category: item?.category ?? "", description: item?.description ?? "", minutes: String(item?.minutes ?? 60), price: item ? String(item.price) : "", commissionPct: item?.commissionPct != null ? String(item.commissionPct) : "", online: item?.online ?? true, active: item?.active ?? true });
  const [who, setWho] = useState<string[]>(item?.staffIds ? item.staffIds.split(",") : []);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre del servicio.");
    const mins = Number(f.minutes);
    if (!(mins >= 10 && mins <= 480)) return setErr("La duración va de 10 a 480 minutos.");
    const body = { name: f.name.trim(), category: f.category.trim() || null, description: f.description.trim() || null, minutes: mins, price: Number(f.price) || 0, commissionPct: f.commissionPct.trim() === "" ? null : Number(f.commissionPct), staffIds: who, online: f.online, active: f.active };
    setBusy(true);
    try { await api(item ? `/salon/services/${item.id}` : "/salon/services", { method: item ? "PATCH" : "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar servicio" : "Nuevo servicio"}</h2>
      <div className="field-row">
        <div className="field"><label htmlFor="sv-n">Nombre</label><input id="sv-n" type="text" maxLength={80} value={f.name} placeholder="Balayage, corte de hombre…" autoComplete="off" onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="sv-c">Categoría</label><input id="sv-c" type="text" list="sv-cats" value={f.category} placeholder="Cabello, Uñas, Barbería…" autoComplete="off" onChange={(e) => setF({ ...f, category: e.target.value })} /><datalist id="sv-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="sv-m">Duración (minutos)</label><NumInput id="sv-m" value={f.minutes} onChange={(v) => setF({ ...f, minutes: v })} /><p className="field__hint">La agenda bloquea ese tiempo para que las citas no se crucen.</p></div>
        <div className="field"><label htmlFor="sv-p">Precio</label><NumInput id="sv-p" value={f.price} onChange={(v) => setF({ ...f, price: v })} /></div>
      </div>
      <div className="field"><label htmlFor="sv-d">Descripción (opcional)</label><input id="sv-d" type="text" maxLength={240} value={f.description} autoComplete="off" onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="field"><label htmlFor="sv-cm">Comisión propia (%) — opcional</label><input id="sv-cm" type="text" inputMode="numeric" value={f.commissionPct} placeholder="Vacío = la comisión de cada profesional" autoComplete="off" onChange={(e) => setF({ ...f, commissionPct: e.target.value.replace(/\D/g, "").slice(0, 3) })} /></div>
      <fieldset className="field"><legend>¿Quién lo hace?</legend><div className="chips">{staff.filter((s) => s.active).map((s) => <button type="button" key={s.id} className={who.includes(s.id) ? "is-on" : ""} aria-pressed={who.includes(s.id)} onClick={() => setWho((l) => (l.includes(s.id) ? l.filter((x) => x !== s.id) : [...l, s.id]))}>{s.name}</button>)}</div><p className="field__hint">{who.length ? "Solo ellos pueden atender este servicio." : "Sin elegir: todos los profesionales lo pueden hacer."}</p></fieldset>
      <label className="check"><input type="checkbox" checked={f.online} onChange={(e) => setF({ ...f, online: e.target.checked })} /> Se puede reservar en línea</label>
      {item ? <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Activo</label> : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

export function SalonTeamView() {
  const { state, allowed } = useSalonAccess(ADMIN);
  const { data, error, reload } = useResource<SalonProfileData>(allowed ? "/salon/profile" : null);
  const [tab, setTab] = useState<"staff" | "services">("staff");
  const [dlg, setDlg] = useState<{ k: "staff"; i: SalonStaffRow | null } | { k: "svc"; i: SalonServiceRow | null } | { k: "del"; t: "staff" | "service"; id: string; name: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const staff = data?.staff ?? [];
  const services = data?.services ?? [];
  const cats = [...new Set(services.map((s) => s.category).filter(Boolean))] as string[];
  async function del() {
    if (dlg?.k !== "del") return;
    try { await api(`/salon/${dlg.t === "staff" ? "staff" : "services"}/${dlg.id}`, { method: "DELETE" }); setDlg(null); reload(); } catch (x) { setErr(errMsg(x)); setDlg(null); }
  }
  const done = () => { setDlg(null); reload(); };
  const staffName = (ids: string | null) => (ids ? ids.split(",").map((id) => staff.find((s) => s.id === id)?.name ?? "").filter(Boolean).join(", ") : "Todos");
  return (
    <div className="page">
      <div className="page-head"><div><h1>Profesionales y servicios</h1><p className="lede">Tu equipo con sus horarios y comisiones, y el menú de servicios con su duración y precio.</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg(tab === "staff" ? { k: "staff", i: null } : { k: "svc", i: null })}>{tab === "staff" ? "Nuevo profesional" : "Nuevo servicio"}</button></div>
      <div className="chips" role="tablist" aria-label="Sección">{([["staff", `Profesionales (${staff.length})`], ["services", `Servicios (${services.length})`]] as const).map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? "is-on" : ""} onClick={() => setTab(v)}>{l}</button>)}</div>
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      {tab === "staff" ? (
        <div className="table-wrap"><table className="table"><thead><tr><th>Profesional</th><th>Horario</th><th>Comisión</th><th></th></tr></thead><tbody>
          {staff.map((s) => (
            <tr key={s.id}><td><i className="dot" style={{ background: s.color, display: "inline-block", width: 10, height: 10, borderRadius: 5, marginRight: 6 }} aria-hidden="true" /><b>{s.name}</b>{s.title ? <><br /><span className="field__hint">{s.title}</span></> : null}{!s.active ? <> <span className="badge badge--info">Inactivo</span></> : null}{s.userId ? <><br /><span className="field__hint">Con acceso al panel</span></> : null}</td>
              <td>{s.workDays.split(",").map(Number).map((d) => WEEKDAYS[d]).join(" ")}<br /><span className="field__hint">{hhmm(s.openMin)}–{hhmm(s.closeMin)}</span></td><td>{s.commissionPct}% servicios<br /><span className="field__hint">{s.productPct}% productos</span></td>
              <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "staff", i: s })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del", t: "staff", id: s.id, name: s.name })}>Eliminar</button></td></tr>
          ))}
        </tbody></table></div>
      ) : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Servicio</th><th>Duración</th><th>Precio</th><th>Lo hace</th><th></th></tr></thead><tbody>
          {services.map((s) => (
            <tr key={s.id}><td><b>{s.name}</b>{s.category ? <><br /><span className="field__hint">{s.category}</span></> : null}{!s.active ? <> <span className="badge badge--info">Inactivo</span></> : null}{!s.online && s.active ? <> <span className="badge badge--info">Solo en el salón</span></> : null}</td><td>{durationLabel(s.minutes)}</td><td>{formatMoney(s.price)}{s.commissionPct != null ? <><br /><span className="field__hint">comisión {s.commissionPct}%</span></> : null}</td><td>{staffName(s.staffIds)}</td>
              <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "svc", i: s })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del", t: "service", id: s.id, name: s.name })}>Eliminar</button></td></tr>
          ))}
        </tbody></table></div>
      )}
      {data && tab === "staff" && !staff.length ? <p className="lede">Aún no hay profesionales. Crea el primero para abrir la agenda.</p> : null}
      <Dlg open={dlg?.k === "staff"} onClose={() => setDlg(null)} wide>{dlg?.k === "staff" ? <StaffForm item={dlg.i} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "svc"} onClose={() => setDlg(null)} wide>{dlg?.k === "svc" ? <ServiceForm item={dlg.i} staff={staff} categories={cats} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <ConfirmDialog open={dlg?.k === "del"} title="Eliminar" message={dlg?.k === "del" ? `¿Eliminar «${dlg.name}»? Si ya tiene citas o ventas, desactívalo en su lugar.` : ""} confirmLabel="Sí, eliminar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
