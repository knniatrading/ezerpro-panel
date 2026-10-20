"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, todayISO } from "@/lib/format";
import { CHARGE_KINDS, CHARGE_TEXT, METHOD_TEXT, PAY_METHODS, curMonth, monthOpts, niceDate } from "@/lib/residential";
import type { ResPaymentRow, ResPortfolio, ResStatement } from "@/lib/residential";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { ADMIN, ADMIN_BOARD, Dlg, Empty, Err, Pill, Tabs, UnitSelect, errMsg, useResAccess, useUnitOptions } from "./res-common";

function GenerateForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [period, setPeriod] = useState(curMonth());
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { const r = await api<{ created: number }>("/residential/billing/generate", { method: "POST", body: JSON.stringify({ period }) }); setRes(r.created ? `Se generaron ${r.created} cuotas.` : "Ese mes ya estaba generado: no se repitió ninguna cuota."); onDone(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Generar cuotas de administración</h2>
      <p className="lede">Crea la cuota del mes para cada unidad que tenga valor de cuota. Si repites el mes, no se duplican.</p>
      <div className="field"><label htmlFor="gn-p">Mes</label><select id="gn-p" value={period} onChange={(e) => { setPeriod(e.target.value); setRes(null); }}>{monthOpts(4, 1).map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
      <Err msg={err} />{res ? <p className="note" role="status">{res}</p> : null}
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Generando…" : "Generar"}</button></div>
    </form>
  );
}

function ChargeForm({ units, onClose, onDone }: { units: ReturnType<typeof useUnitOptions>; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ kind: "extraordinaria", concept: "", scope: "all" as "all" | "one", unitId: "", mode: "fijo" as "fijo" | "coeficiente", amount: "", dueYmd: todayISO() });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.concept.trim().length < 3) return setErr("Escribe el concepto.");
    const n = Number(f.amount.replace(/\D/g, ""));
    if (!n) return setErr("Escribe el valor.");
    if (f.scope === "one" && !f.unitId) return setErr("Elige la unidad.");
    if (f.scope === "one" && f.mode === "coeficiente") return setErr("El reparto por coeficiente es para todas las unidades.");
    setBusy(true);
    const body = { kind: f.kind, concept: f.concept.trim(), dueYmd: f.dueYmd, ...(f.scope === "all" ? { all: true } : { unitId: f.unitId }), ...(f.mode === "coeficiente" ? { mode: "coeficiente", total: n } : { amount: n }) };
    try { await api("/residential/billing/charges", { method: "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Nuevo cobro</h2>
      <div className="field-row">
        <div className="field"><label htmlFor="ch-k">Tipo</label><select id="ch-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{CHARGE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
        <div className="field"><label htmlFor="ch-d">Vence</label><input id="ch-d" type="date" value={f.dueYmd} onChange={(e) => setF({ ...f, dueYmd: e.target.value })} /></div>
      </div>
      <div className="field"><label htmlFor="ch-c">Concepto</label><input id="ch-c" type="text" value={f.concept} placeholder="Impermeabilización de cubiertas" autoComplete="off" onChange={(e) => { setF({ ...f, concept: e.target.value }); setErr(null); }} /></div>
      <div className="chips" role="group" aria-label="A quién">{([["all", "A todas las unidades"], ["one", "A una unidad"]] as const).map(([v, l]) => <button type="button" key={v} className={f.scope === v ? "is-on" : ""} aria-pressed={f.scope === v} onClick={() => setF({ ...f, scope: v, mode: v === "one" ? "fijo" : f.mode })}>{l}</button>)}</div>
      {f.scope === "one" ? <UnitSelect id="ch-u" value={f.unitId} onChange={(v) => setF({ ...f, unitId: v })} opts={units} /> : (
        <div className="chips" role="group" aria-label="Cómo se reparte">{([["fijo", "El mismo valor a cada unidad"], ["coeficiente", "Repartir un total según el coeficiente"]] as const).map(([v, l]) => <button type="button" key={v} className={f.mode === v ? "is-on" : ""} aria-pressed={f.mode === v} onClick={() => setF({ ...f, mode: v })}>{l}</button>)}</div>
      )}
      <div className="field"><label htmlFor="ch-a">{f.mode === "coeficiente" ? "Total a repartir" : "Valor"}</label><input id="ch-a" type="text" inputMode="numeric" value={f.amount} autoComplete="off" onChange={(e) => { setF({ ...f, amount: e.target.value.replace(/\D/g, "") }); setErr(null); }} />
        {f.mode === "coeficiente" && f.amount ? <p className="field__hint">Cada unidad paga su coeficiente del total de {formatMoney(Number(f.amount))}.</p> : null}</div>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Crear cobro"}</button></div>
    </form>
  );
}

function PayForm({ unitId, units, onClose, onDone }: { unitId: string; units: ReturnType<typeof useUnitOptions>; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ unitId, amount: "", method: "transferencia", reference: "", paidYmd: todayISO() });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.unitId) return setErr("Elige la unidad.");
    const n = Number(f.amount.replace(/\D/g, ""));
    if (!n) return setErr("Escribe el valor pagado.");
    setBusy(true);
    try { await api("/residential/billing/payments", { method: "POST", body: JSON.stringify({ unitId: f.unitId, amount: n, method: f.method, reference: f.reference.trim() || null, paidYmd: f.paidYmd }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Registrar pago</h2>
      <UnitSelect id="py-u" value={f.unitId} onChange={(v) => setF({ ...f, unitId: v })} opts={units} />
      <div className="field-row">
        <div className="field"><label htmlFor="py-a">Valor</label><input id="py-a" type="text" inputMode="numeric" value={f.amount} autoComplete="off" onChange={(e) => { setF({ ...f, amount: e.target.value.replace(/\D/g, "") }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="py-m">Medio</label><select id="py-m" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{PAY_METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="py-r">Referencia (opcional)</label><input id="py-r" type="text" value={f.reference} autoComplete="off" onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
        <div className="field"><label htmlFor="py-d">Fecha</label><input id="py-d" type="date" value={f.paidYmd} max={todayISO()} onChange={(e) => setF({ ...f, paidYmd: e.target.value })} /></div>
      </div>
      <p className="field__hint">El pago se aplica primero a las cuotas más antiguas.</p>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Registrar pago"}</button></div>
    </form>
  );
}

function StatementDlg({ unitId, admin, onClose, onChanged }: { unitId: string; admin: boolean; onClose: () => void; onChanged: () => void }) {
  const st = useResource<ResStatement>(`/residential/billing/statement/${unitId}`);
  const [err, setErr] = useState<string | null>(null);
  async function act(path: string) { try { await api(path, { method: "POST", body: JSON.stringify({}) }); st.reload(); onChanged(); } catch (x) { setErr(errMsg(x)); } }
  const s = st.data;
  if (!s) return <div><h2 id="dlg-title" tabIndex={-1}>Estado de cuenta</h2><p className="lede">{st.error ?? "Cargando…"}</p></div>;
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>Estado de cuenta · {s.unit.label}</h2>
      <div className="kpis"><div className="kpi"><span>Saldo</span><strong>{formatMoney(s.balance)}</strong></div><div className={`kpi${s.overdue ? " kpi--warn" : ""}`}><span>Vencido</span><strong>{formatMoney(s.overdue)}</strong></div>{s.credit ? <div className="kpi"><span>Saldo a favor</span><strong>{formatMoney(s.credit)}</strong></div> : null}</div>
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      <h3>Cobros</h3>
      <div className="table-wrap"><table className="table"><thead><tr><th>Concepto</th><th>Vence</th><th className="num-r">Valor</th><th className="num-r">Pendiente</th><th></th></tr></thead><tbody>
        {s.charges.map((c) => <tr key={c.id}><td>{c.concept}<br /><span className="field__hint">{CHARGE_TEXT[c.kind] ?? c.kind}</span></td><td>{niceDate(c.dueYmd)}</td><td className="num-r">{formatMoney(c.amount)}</td><td className="num-r">{c.pending > 0 ? <Pill tone={c.overdue ? "warn" : "info"}>{formatMoney(c.pending)}</Pill> : <Pill tone="ok">Pagado</Pill>}</td>
          <td className="actions-cell">{admin && c.paid === 0 ? <button className="btn btn--danger-ghost btn--sm" onClick={() => act(`/residential/billing/charges/${c.id}/void`)}>Anular</button> : null}</td></tr>)}
      </tbody></table></div>
      {!s.charges.length ? <Empty>Sin cobros.</Empty> : null}
      <h3>Pagos</h3>
      <div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Medio</th><th className="num-r">Valor</th><th></th></tr></thead><tbody>
        {s.payments.map((p) => <tr key={p.id} style={p.voided ? { opacity: 0.55, textDecoration: "line-through" } : undefined}><td>{niceDate(p.paidYmd)}</td><td>{METHOD_TEXT[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ""}</td><td className="num-r">{formatMoney(p.amount)}</td>
          <td className="actions-cell">{admin && !p.voided ? <button className="btn btn--danger-ghost btn--sm" onClick={() => act(`/residential/billing/payments/${p.id}/void`)}>Anular</button> : null}</td></tr>)}
      </tbody></table></div>
      {!s.payments.length ? <Empty>Sin pagos.</Empty> : null}
      <div className="dialog__actions"><button className="btn btn--primary" onClick={onClose}>Cerrar</button></div>
    </div>
  );
}

export function ResBillingView() {
  const { state, allowed, role } = useResAccess(ADMIN_BOARD);
  const admin = role === "TENANT_ADMIN";
  const [tab, setTab] = useState<"portfolio" | "payments">("portfolio");
  const [filter, setFilter] = useState<"all" | "mora">("mora");
  const [q, setQ] = useState("");
  const port = useResource<ResPortfolio>(allowed ? "/residential/billing/portfolio" : null);
  const pays = useResource<ResPaymentRow[]>(allowed && tab === "payments" ? "/residential/billing/payments" : null);
  const units = useUnitOptions(allowed && admin);
  const [dlg, setDlg] = useState<null | "gen" | "charge" | "remind" | { pay: string } | { stmt: string }>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const close = () => setDlg(null);
  const done = () => { close(); port.reload(); pays.reload(); };
  const t = q.trim().toLowerCase();
  const rows = (port.data?.rows ?? []).filter((r) => (filter === "all" || r.overdue > 0) && (!t || `${r.label} ${r.owner ?? ""}`.toLowerCase().includes(t)));
  async function remind() { setBusy(true); setErr(null); try { const r = await api<{ sent: number; units: number }>("/residential/billing/remind", { method: "POST", body: JSON.stringify({}) }); setMsg(`${r.units} unidades en mora; se enviaron ${r.sent} correos de recordatorio. Para WhatsApp usa el botón de cada fila.`); close(); } catch (x) { setErr(errMsg(x)); close(); } finally { setBusy(false); } }
  const tot = port.data?.totals;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Cartera y cuotas</h1><p className="lede">Estado de cuenta de cada unidad y recordatorios a quienes deben.</p></div>
        {admin ? <div className="actions-cell"><button className="btn btn--primary btn--sm" onClick={() => setDlg({ pay: "" })}>Registrar pago</button><button className="btn btn--secondary btn--sm" onClick={() => setDlg("gen")}>Generar cuotas</button><button className="btn btn--secondary btn--sm" onClick={() => setDlg("charge")}>Nuevo cobro</button><button className="btn btn--secondary btn--sm" onClick={() => setDlg("remind")}>Recordar a morosos</button></div> : null}</div>
      {tot ? <div className="kpis"><div className="kpi"><span>Cartera total</span><strong>{formatMoney(tot.debt)}</strong></div><div className="kpi kpi--warn"><span>Vencido</span><strong>{formatMoney(tot.overdue)}</strong><small>{tot.morosos} unidades</small></div><div className="kpi"><span>Facturado este mes</span><strong>{formatMoney(tot.billedMonth)}</strong></div><div className="kpi"><span>Recaudado este mes</span><strong>{formatMoney(tot.collectedMonth)}</strong></div></div> : null}
      {!admin ? <p className="note">El consejo ve la cartera en modo consulta. Los pagos y cobros los registra la administración.</p> : null}
      {msg ? <p className="note" role="status">{msg}</p> : null}{err ? <p className="form-error" role="alert">{err}</p> : null}{port.error ? <p className="form-error" role="alert">{port.error}</p> : null}
      <Tabs tabs={[["portfolio", "Cartera"], ["payments", "Pagos recientes"]]} value={tab} onChange={setTab} />
      {tab === "portfolio" ? (
        <>
          <div className="agenda-bar"><div className="chips" role="group" aria-label="Filtro">{([["mora", "Solo en mora"], ["all", "Todas"]] as const).map(([v, l]) => <button key={v} type="button" className={filter === v ? "is-on" : ""} aria-pressed={filter === v} onClick={() => setFilter(v)}>{l}</button>)}</div><label>Buscar <input type="search" value={q} placeholder="Unidad o propietario" onChange={(e) => setQ(e.target.value)} /></label></div>
          <div className="table-wrap"><table className="table"><thead><tr><th>Unidad</th><th>Propietario</th><th className="num-r">Saldo</th><th className="num-r">Vencido</th><th></th></tr></thead><tbody>
            {rows.map((r) => <tr key={r.unitId}><td><b>{r.label}</b></td><td>{r.owner ?? "—"}</td><td className="num-r">{formatMoney(r.balance)}</td><td className="num-r">{r.overdue > 0 ? <Pill tone="warn">{formatMoney(r.overdue)}</Pill> : "—"}</td>
              <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ stmt: r.unitId })}>Estado de cuenta</button>{r.overdue > 0 && r.wa ? <a className="btn btn--secondary btn--sm" href={r.wa} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}{admin ? <button className="btn btn--primary btn--sm" onClick={() => setDlg({ pay: r.unitId })}>Pago</button> : null}</td></tr>)}
          </tbody></table></div>
          {port.data && !rows.length ? <Empty>{filter === "mora" ? "No hay unidades en mora. ¡Buen trabajo!" : "No hay unidades."}</Empty> : null}
        </>
      ) : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Unidad</th><th>Medio</th><th className="num-r">Valor</th><th>Registró</th></tr></thead><tbody>
          {(pays.data ?? []).map((p) => <tr key={p.id} style={p.voided ? { opacity: 0.55, textDecoration: "line-through" } : undefined}><td>{niceDate(p.paidYmd)}</td><td>{p.unit}</td><td>{METHOD_TEXT[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ""}</td><td className="num-r">{formatMoney(p.amount)}</td><td>{p.byName ?? "—"}</td></tr>)}
        </tbody></table></div>
      )}
      <Dlg open={dlg === "gen"} onClose={close}>{dlg === "gen" ? <GenerateForm onClose={close} onDone={() => port.reload()} /> : null}</Dlg>
      <Dlg open={dlg === "charge"} onClose={close}>{dlg === "charge" ? <ChargeForm units={units} onClose={close} onDone={done} /> : null}</Dlg>
      <Dlg open={typeof dlg === "object" && dlg !== null && "pay" in dlg} onClose={close}>{typeof dlg === "object" && dlg && "pay" in dlg ? <PayForm unitId={dlg.pay} units={units} onClose={close} onDone={done} /> : null}</Dlg>
      <Dlg open={typeof dlg === "object" && dlg !== null && "stmt" in dlg} onClose={close} wide>{typeof dlg === "object" && dlg && "stmt" in dlg ? <StatementDlg unitId={dlg.stmt} admin={admin} onClose={close} onChanged={() => port.reload()} /> : null}</Dlg>
      <ConfirmDialog open={dlg === "remind"} title="Recordar a los morosos" message="Se enviará un correo de recordatorio a los propietarios con cuotas vencidas (los que tienen correo registrado). ¿Continuar?" confirmLabel={busy ? "Enviando…" : "Sí, enviar"} busy={busy} onConfirm={remind} onClose={close} />
    </div>
  );
}
void ADMIN;
