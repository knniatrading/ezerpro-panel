"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { STATUS_TEXT, VEHICLE_KINDS, dateCO, niceDate, waLink } from "@/lib/taller";
import type { TallerVehicleDetail, TallerVehicleRow } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ALL, Dlg, NewOrderDialog, Plate, StatusBadge, errMsg, useMechanics, useTallerAccess } from "./taller-common";

/** Buscador por placa: el "historial clínico" del vehículo. */
export function TallerVehiclesView() {
  const { state, allowed } = useTallerAccess(["TENANT_ADMIN", "CASHIER", "EMPLOYEE"]);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [nw, setNw] = useState(false);
  const router = useRouter();
  useEffect(() => { const h = setTimeout(() => setDq(q.trim()), 250); return () => clearTimeout(h); }, [q]);
  const { data, error, loading } = useResource<TallerVehicleRow[]>(allowed ? `/taller/vehicles${dq ? `?q=${encodeURIComponent(dq)}` : ""}` : null);
  const mechanics = useMechanics(allowed && state.status === "in" && state.user.role !== "EMPLOYEE");
  if (state.status === "in" && !allowed) return <NoAccess />;
  const canCreate = state.status === "in" && state.user.role !== "EMPLOYEE";
  return (
    <div className="page">
      <div className="page-head"><div><h1>Vehículos</h1><p className="lede">Escribe una placa y mira todo lo que le han hecho: cambios de aceite, repuestos y reparaciones.</p></div>
        {canCreate ? <button className="btn btn--primary btn--sm" onClick={() => setNw(true)}>Recibir un vehículo</button> : null}</div>
      <div className="field tl-search"><label htmlFor="vh-q">Buscar por placa, dueño o celular</label><input id="vh-q" type="search" value={q} placeholder="Ej.: ABC123" autoComplete="off" onChange={(e) => setQ(e.target.value)} /></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Placa</th><th>Vehículo</th><th>Dueño</th><th>Km</th><th>Visitas</th><th>Última visita</th></tr></thead><tbody>
        {(data ?? []).map((v) => (
          <tr key={v.id}><td><Link href={`/vehiculos/${v.id}`}><Plate plate={v.plate} kind={v.kind} /></Link></td><td>{v.label}</td><td>{v.customerName}<br /><span className="field__hint">{v.phone}</span></td><td>{v.km.toLocaleString("es-CO")}</td><td>{v.orders}</td><td>{v.lastVisit ? dateCO(v.lastVisit) : "—"}{v.lastStatus ? <> <StatusBadge status={v.lastStatus} /></> : null}</td></tr>
        ))}
      </tbody></table></div>
      {data && !data.length && !loading ? <p className="lede">No encontramos vehículos con ese dato.</p> : null}
      <Dlg open={nw} onClose={() => setNw(false)}>{nw ? <NewOrderDialog mechanics={mechanics} canAssign onClose={() => setNw(false)} onDone={(id) => router.push(`/ordenes/${id}`)} /> : null}</Dlg>
    </div>
  );
}

function EditDialog({ d, canOwner, onClose, onDone }: { d: TallerVehicleDetail; canOwner: boolean; onClose: () => void; onDone: () => void }) {
  const v = d.vehicle;
  const [f, setF] = useState({ kind: v.kind, brand: v.brand ?? "", model: v.model ?? "", year: v.year ? String(v.year) : "", color: v.color ?? "", oil: v.oil ?? "", km: String(v.km), notes: v.notes ?? "", name: d.customer.name, phone: d.customer.phone, email: d.customer.email ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = { oil: f.oil.trim() || null, km: Number(f.km || 0), notes: f.notes.trim() || null };
      if (canOwner) Object.assign(body, { kind: f.kind, brand: f.brand.trim() || null, model: f.model.trim() || null, year: f.year ? Number(f.year) : null, color: f.color.trim() || null });
      await api(`/taller/vehicles/${v.id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (canOwner) await api(`/taller/customers/${d.customer.id}`, { method: "PATCH", body: JSON.stringify({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || null }) });
      onDone();
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Datos de {v.plate}</h2>
      {canOwner ? (
        <>
          <div className="field-row">
            <div className="field"><label htmlFor="ev-kind">Tipo</label><select id="ev-kind" value={f.kind} onChange={set("kind")}>{VEHICLE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
            <div className="field"><label htmlFor="ev-brand">Marca</label><input id="ev-brand" type="text" value={f.brand} onChange={set("brand")} /></div>
            <div className="field"><label htmlFor="ev-model">Modelo</label><input id="ev-model" type="text" value={f.model} onChange={set("model")} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="ev-year">Año</label><input id="ev-year" type="number" value={f.year} onChange={set("year")} /></div>
            <div className="field"><label htmlFor="ev-color">Color</label><input id="ev-color" type="text" value={f.color} onChange={set("color")} /></div>
          </div>
        </>
      ) : null}
      <div className="field-row">
        <div className="field"><label htmlFor="ev-oil">Aceite que usa</label><input id="ev-oil" type="text" maxLength={80} value={f.oil} placeholder="Ej.: 10W-40 semisintético" onChange={set("oil")} /></div>
        <div className="field"><label htmlFor="ev-km">Kilometraje</label><input id="ev-km" type="number" min={0} value={f.km} onChange={set("km")} /></div>
      </div>
      <div className="field"><label htmlFor="ev-notes">Notas del vehículo</label><textarea id="ev-notes" rows={2} maxLength={500} value={f.notes} onChange={set("notes")} /></div>
      {canOwner ? (
        <div className="field-row">
          <div className="field"><label htmlFor="ev-name">Dueño</label><input id="ev-name" type="text" value={f.name} onChange={set("name")} /></div>
          <div className="field"><label htmlFor="ev-phone">Celular</label><input id="ev-phone" type="tel" value={f.phone} onChange={set("phone")} /></div>
          <div className="field"><label htmlFor="ev-mail">Correo</label><input id="ev-mail" type="email" value={f.email} onChange={set("email")} /></div>
        </div>
      ) : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

export function TallerVehicleView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, allowed, role } = useTallerAccess(ALL);
  const { data: d, error, reload } = useResource<TallerVehicleDetail>(allowed ? `/taller/vehicles/${id}` : null);
  const [edit, setEdit] = useState(false);
  const [nw, setNw] = useState(false);
  const mechanics = useMechanics(allowed && role !== "EMPLOYEE");
  if (state.status === "in" && !allowed) return <NoAccess />;
  if (error) return <div className="page"><p className="form-error" role="alert">{error}</p><Link href="/vehiculos">← Volver a vehículos</Link></div>;
  if (!d) return <div className="page"><p className="lede" role="status">Cargando…</p></div>;
  const { vehicle: v, customer: c } = d;
  const oils = d.history.filter((h) => h.status === "entregado" && h.items.some((i) => /aceite/i.test(i.description)));
  const parts = d.history.filter((h) => h.status === "entregado").flatMap((h) => h.items.filter((i) => i.kind === "repuesto").map((i) => ({ ...i, date: h.deliveredAt ?? h.createdAt })));
  const first = c.name.split(" ")[0];
  return (
    <div className="page">
      <div className="page-head"><div><h1><Plate plate={v.plate} kind={v.kind} /> {v.label}</h1><p className="lede">{c.name} · {c.phone}{c.email ? ` · ${c.email}` : ""}</p></div>
        <div className="actions-cell">{role !== "EMPLOYEE" ? <button className="btn btn--primary btn--sm" onClick={() => setNw(true)}>Nueva orden</button> : null}<button className="btn btn--secondary btn--sm" onClick={() => setEdit(true)}>Editar datos</button>
          {role !== "EMPLOYEE" ? <a className="btn btn--secondary btn--sm" href={waLink(c.phone, `Hola ${first}, aquí puedes ver el historial de tu ${v.label} (${v.plate}) y tus próximos mantenimientos: ${c.portalUrl}`)} target="_blank" rel="noreferrer">Enviar portal por WhatsApp</a> : null}</div></div>
      <div className="kpis" role="group" aria-label="Resumen del vehículo">
        <div className="kpi"><span>Kilometraje</span><strong>{v.km.toLocaleString("es-CO")}</strong></div>
        <div className="kpi"><span>Aceite que usa</span><strong className="kpi__txt">{v.oil ?? "Sin registrar"}</strong></div>
        <div className="kpi"><span>Visitas</span><strong>{d.history.length}</strong></div>
        {d.spent !== null ? <div className="kpi"><span>Ha gastado</span><strong>{formatMoney(d.spent)}</strong></div> : null}
      </div>
      {v.notes ? <p className="note">{v.notes}</p> : null}
      <div className="cl-stack">
        <section className="card" aria-label="Próximos mantenimientos"><h2>Próximos mantenimientos</h2>
          {!d.reminders.length ? <p className="field__hint">Sin mantenimientos programados. Se crean solos cuando entregas un servicio con recordatorio (por ejemplo, cambio de aceite).</p> : <ul className="plain-list">{d.reminders.map((r) => <li key={r.id}><b>{r.serviceName}</b> · {niceDate(r.dueDate)}{r.dueKm ? ` o a los ${r.dueKm.toLocaleString("es-CO")} km` : ""}{r.overdue ? <> <span className="badge badge--warn">Vencido</span></> : null}</li>)}</ul>}
        </section>
        {oils.length ? <section className="card" aria-label="Cambios de aceite"><h2>Cambios de aceite</h2><ul className="plain-list">{oils.slice(0, 6).map((h) => <li key={h.id}>{dateCO(h.deliveredAt ?? h.createdAt)} · {h.kmIn ? `${h.kmIn.toLocaleString("es-CO")} km · ` : ""}{h.items.filter((i) => /aceite/i.test(i.description)).map((i) => i.description).join(", ")}</li>)}</ul></section> : null}
        {parts.length ? <section className="card" aria-label="Repuestos cambiados"><h2>Repuestos cambiados</h2><ul className="plain-list">{parts.slice(0, 12).map((p, i) => <li key={p.id + i}>{dateCO(p.date)} · {p.qty > 1 ? `${p.qty} × ` : ""}{p.description}</li>)}</ul></section> : null}
        <section className="card" aria-label="Historial"><h2>Historial de servicios</h2>
          {!d.history.length ? <p className="field__hint">Este vehículo aún no tiene órdenes.</p> : null}
          <ul className="tl-hist">{d.history.map((h) => (
            <li key={h.id}>
              <div className="tl-hist__top"><Link href={`/ordenes/${h.id}`}><b>Orden #{h.number}</b></Link> <span className="field__hint">{dateCO(h.deliveredAt ?? h.createdAt)}{h.kmIn ? ` · ${h.kmIn.toLocaleString("es-CO")} km` : ""}{h.mechanicName ? ` · ${h.mechanicName}` : ""}</span> <StatusBadge status={h.status} /></div>
              <p>{h.complaint}</p>
              {h.diagnosis ? <p className="field__hint">Diagnóstico: {h.diagnosis}</p> : null}
              {h.items.length ? <ul className="plain-list">{h.items.map((i) => <li key={i.id}>{i.kind === "mano_obra" ? "🔧" : "⚙️"} {i.qty > 1 ? `${i.qty} × ` : ""}{i.description}{role !== "EMPLOYEE" ? ` · ${formatMoney(i.qty * i.unitPrice)}` : ""}</li>)}</ul> : null}
              {h.total && role !== "EMPLOYEE" ? <p>Total <b>{formatMoney(h.total)}</b>{h.paid !== null && h.paid < h.total && h.status !== "cancelado" ? <> · <span className="badge badge--warn">Debe {formatMoney(h.total - h.paid)}</span></> : null}</p> : null}
            </li>
          ))}</ul>
        </section>
      </div>
      <Dlg open={edit} onClose={() => setEdit(false)}>{edit ? <EditDialog d={d} canOwner={role !== "EMPLOYEE"} onClose={() => setEdit(false)} onDone={() => { setEdit(false); reload(); }} /> : null}</Dlg>
      <Dlg open={nw} onClose={() => setNw(false)}>{nw ? <NewOrderDialog mechanics={mechanics} canAssign presetVehicle={{ id: v.id, label: v.label, plate: v.plate, km: v.km }} onClose={() => setNw(false)} onDone={(oid) => router.push(`/ordenes/${oid}`)} /> : null}</Dlg>
    </div>
  );
}
void STATUS_TEXT;
