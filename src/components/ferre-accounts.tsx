"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { LIST_TEXT, PAY_METHODS, dateCO, niceDate, waLink } from "@/lib/ferre";
import type { FerreCustomer, FerreCustomerDetail, FerreReceivables } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ConfirmDialog } from "./confirm-dialog";
import { Dlg, NumInput, errMsg, useFerreAccess } from "./ferre-common";

function CustomerDialog({ item, admin, onClose, onDone }: { item: FerreCustomer | null; admin: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const [f, setF] = useState({ name: item?.name ?? "", phone: item?.phone ?? "", document: item?.document ?? "", email: item?.email ?? "", address: item?.address ?? "", notes: item?.notes ?? "", priceList: item?.priceList ?? "detal", creditLimit: String(item?.creditLimit || ""), creditDays: String(item?.creditDays ?? 30) });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const body: Record<string, unknown> = { name: f.name.trim(), phone: f.phone.trim(), document: f.document.trim() || null, email: f.email.trim() || null, address: f.address.trim() || null, notes: f.notes.trim() || null };
    if (admin) Object.assign(body, { priceList: f.priceList, creditLimit: Number(f.creditLimit || 0), creditDays: Number(f.creditDays || 30) });
    try {
      const r = item ? await api<FerreCustomer>(`/ferre/customers/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }) : await api<FerreCustomer>("/ferre/customers", { method: "POST", body: JSON.stringify(body) });
      onDone(r.id);
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar cliente" : "Nuevo cliente"}</h2>
      <div className="field"><label htmlFor="cu-n">Nombre</label><input id="cu-n" type="text" maxLength={80} value={f.name} autoComplete="off" onChange={set("name")} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="cu-p">Celular</label><input id="cu-p" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={set("phone")} /></div>
        <div className="field"><label htmlFor="cu-d">Cédula o NIT</label><input id="cu-d" type="text" value={f.document} autoComplete="off" onChange={set("document")} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="cu-e">Correo (para recordatorios)</label><input id="cu-e" type="email" value={f.email} autoComplete="off" onChange={set("email")} /></div>
        <div className="field"><label htmlFor="cu-a">Dirección</label><input id="cu-a" type="text" value={f.address} autoComplete="off" onChange={set("address")} /></div>
      </div>
      {admin ? (
        <fieldset className="field"><legend>Precios y crédito</legend>
          <div className="field-row">
            <div className="field"><label htmlFor="cu-l">Lista de precios</label><select id="cu-l" value={f.priceList} onChange={set("priceList")}><option value="detal">Detal (público)</option><option value="mayorista">Mayorista (maestros y constructores)</option></select></div>
            <div className="field"><label htmlFor="cu-c">Cupo de crédito</label><NumInput id="cu-c" value={f.creditLimit} placeholder="0 = sin crédito" onChange={(v) => { setF({ ...f, creditLimit: v }); setErr(null); }} /></div>
            <div className="field"><label htmlFor="cu-dd">Plazo (días)</label><input id="cu-dd" type="number" min={1} max={365} value={f.creditDays} onChange={set("creditDays")} /></div>
          </div>
        </fieldset>
      ) : null}
      <div className="field"><label htmlFor="cu-no">Notas</label><input id="cu-no" type="text" maxLength={500} value={f.notes} autoComplete="off" onChange={set("notes")} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

/** Cartera: quién debe, cuánto y desde cuándo. */
export function FerreAccountsView() {
  const { state, allowed, role } = useFerreAccess();
  const admin = role === "TENANT_ADMIN";
  const [q, setQ] = useState("");
  const [debt, setDebt] = useState(true);
  const { data, error, reload } = useResource<FerreCustomer[]>(allowed ? `/ferre/customers?${debt ? "filter=deuda&" : ""}q=${encodeURIComponent(q.trim())}` : null);
  const rec = useResource<FerreReceivables>(allowed ? "/ferre/receivables" : null);
  const [nw, setNw] = useState(false);
  if (state.status === "in" && !allowed) return <NoAccess />;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Cuentas por cobrar</h1><p className="lede">El crédito a maestros y constructores, con su estado de cuenta.</p></div><button className="btn btn--primary btn--sm" onClick={() => setNw(true)}>Nuevo cliente</button></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="kpis"><div className="kpi"><span>Te deben</span><strong>{formatMoney(rec.data?.total ?? 0)}</strong></div><div className="kpi kpi--warn"><span>Vencido</span><strong>{formatMoney(rec.data?.overdue ?? 0)}</strong></div><div className="kpi"><span>Clientes con deuda</span><strong>{rec.data?.customers.length ?? 0}</strong></div></div>
      <div className="agenda-bar"><label>Buscar <input type="search" value={q} placeholder="Nombre, celular o cédula" onChange={(e) => setQ(e.target.value)} /></label><label className="check"><input type="checkbox" checked={debt} onChange={(e) => setDebt(e.target.checked)} /> Solo con deuda</label></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Cliente</th><th>Lista</th><th>Debe</th><th>Vencido</th><th>Cupo</th><th></th></tr></thead><tbody>
        {(data ?? []).map((c) => (
          <tr key={c.id}><td><b><Link href={`/cuentas/${c.id}`}>{c.name}</Link></b><br /><span className="field__hint">{c.phone}</span></td><td>{LIST_TEXT[c.priceList]}</td><td><b>{formatMoney(c.balance)}</b></td><td>{c.overdue > 0 ? <span className="badge badge--warn">{formatMoney(c.overdue)}</span> : "—"}</td><td>{c.creditLimit > 0 ? `${formatMoney(c.creditLimit)} (disp. ${formatMoney(c.available)})` : <span className="field__hint">Sin crédito</span>}</td>
            <td className="actions-cell"><Link className="btn btn--secondary btn--sm" href={`/cuentas/${c.id}`}>Estado de cuenta</Link>{c.balance > 0 ? <a className="btn btn--secondary btn--sm" href={waLink(c.phone, `Hola ${c.name.split(" ")[0]}, te recordamos que tienes un saldo de ${formatMoney(c.balance)}${c.overdue > 0 ? `, de los cuales ${formatMoney(c.overdue)} están vencidos` : ""}. ¡Gracias!`)} target="_blank" rel="noreferrer">Recordar</a> : null}</td></tr>
        ))}
      </tbody></table></div>
      {data && !data.length ? <p className="lede">{debt ? "Nadie debe nada por ahora." : "No hay clientes que coincidan."}</p> : null}
      <Dlg open={nw} onClose={() => setNw(false)} wide>{nw ? <CustomerDialog item={null} admin={admin} onClose={() => setNw(false)} onDone={() => { setNw(false); reload(); rec.reload(); }} /> : null}</Dlg>
    </div>
  );
}

function PayDialog({ c, onClose, onDone }: { c: FerreCustomer; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("efectivo");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api(`/ferre/customers/${c.id}/payments`, { method: "POST", body: JSON.stringify({ amount: Number(amount || 0), method, note: note.trim() || null }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Registrar abono</h2>
      <p className="lede">{c.name} debe <b>{formatMoney(c.balance)}</b>.</p>
      <div className="field"><label htmlFor="ab-a">Valor del abono</label><NumInput id="ab-a" value={amount} onChange={(v) => { setAmount(v); setErr(null); }} /></div>
      <div className="chips" role="group" aria-label="Medio de pago">{PAY_METHODS.map((m) => <button key={m.v} type="button" className={method === m.v ? "is-on" : ""} aria-pressed={method === m.v} onClick={() => setMethod(m.v)}>{m.l}</button>)}</div>
      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAmount(String(c.balance))}>Pagar todo ({formatMoney(c.balance)})</button>
      <div className="field"><label htmlFor="ab-n">Nota (opcional)</label><input id="ab-n" type="text" maxLength={200} value={note} autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy || !Number(amount)}>{busy ? "Guardando…" : "Registrar abono"}</button></div>
    </form>
  );
}

export function FerreAccountView({ id }: { id: string }) {
  const { state, allowed, role } = useFerreAccess();
  const admin = role === "TENANT_ADMIN";
  const { data, error, reload } = useResource<FerreCustomerDetail>(allowed ? `/ferre/customers/${id}` : null);
  const [pay, setPay] = useState(false);
  const [edit, setEdit] = useState(false);
  const [delPay, setDelPay] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (state.status === "in" && !allowed) return <NoAccess />;
  if (error) return <div className="page"><p className="form-error" role="alert">{error}</p><Link href="/cuentas">← Volver</Link></div>;
  if (!data) return <div className="page"><p className="lede">Cargando…</p></div>;
  const c = data.customer;
  const msgText = `Hola ${c.name.split(" ")[0]}, este es tu estado de cuenta: debes ${formatMoney(c.balance)}${c.overdue > 0 ? ` (vencido ${formatMoney(c.overdue)})` : ""}. Míralo completo aquí: ${data.accountUrl}`;
  async function copy() { try { await navigator.clipboard.writeText(data!.accountUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setMsg("No se pudo copiar el enlace."); } }
  return (
    <div className="page">
      <div className="page-head no-print"><div><p className="field__hint"><Link href="/cuentas">← Cuentas por cobrar</Link></p><h1>{c.name}</h1><p className="lede">{c.phone}{c.document ? ` · ${c.document}` : ""} · Lista {LIST_TEXT[c.priceList]}{c.creditLimit > 0 ? ` · Cupo ${formatMoney(c.creditLimit)} a ${c.creditDays} días` : " · Sin crédito"}</p></div>
        <div className="actions-cell">{c.balance > 0 ? <button className="btn btn--primary btn--sm" onClick={() => setPay(true)}>Registrar abono</button> : null}<a className="btn btn--secondary btn--sm" href={waLink(c.phone, msgText)} target="_blank" rel="noreferrer">Enviar por WhatsApp</a><button className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button><button className="btn btn--secondary btn--sm" onClick={() => window.print()}>Imprimir</button>{admin ? <button className="btn btn--secondary btn--sm" onClick={() => setEdit(true)}>Editar</button> : null}</div></div>
      {msg ? <p className="form-error" role="alert">{msg}</p> : null}
      <div className="kpis"><div className="kpi"><span>Debe</span><strong>{formatMoney(c.balance)}</strong></div><div className="kpi kpi--warn"><span>Vencido</span><strong>{formatMoney(c.overdue)}</strong></div><div className="kpi"><span>Cupo disponible</span><strong>{formatMoney(c.available)}</strong></div></div>
      <section className="card" aria-label="Facturas pendientes"><h2>Facturas pendientes</h2>
        {!data.charges.length ? <p className="field__hint">No tiene facturas pendientes.</p> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Venta</th><th>Fecha</th><th>Total</th><th>Pendiente</th><th>Vence</th></tr></thead><tbody>
            {data.charges.map((x) => <tr key={x.saleId}><td>#{x.number}</td><td>{dateCO(x.date)}</td><td>{formatMoney(x.total)}</td><td><b>{formatMoney(x.open)}</b></td><td>{niceDate(x.dueDate)} {x.overdue ? <span className="badge badge--warn">Vencida</span> : null}</td></tr>)}
          </tbody></table></div>
        )}
      </section>
      <section className="card" style={{ marginTop: 20 }} aria-label="Estado de cuenta"><h2>Estado de cuenta</h2>
        <div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Detalle</th><th>Cargo / abono</th><th>Saldo</th><th className="no-print"></th></tr></thead><tbody>
          {data.statement.map((l) => (
            <tr key={`${l.kind}-${l.id}`}><td>{dateCO(l.at)}</td><td>{l.ref}</td><td className={l.amount < 0 ? "is-ok" : ""}>{l.amount < 0 ? "−" : ""}{formatMoney(Math.abs(l.amount))}</td><td>{formatMoney(l.balance)}</td><td className="no-print">{l.kind === "abono" && admin ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDelPay(l.id)}>Eliminar</button> : null}</td></tr>
          ))}
        </tbody></table></div>
        {!data.statement.length ? <p className="field__hint">Aún no hay movimientos.</p> : null}
      </section>
      <Dlg open={pay} onClose={() => setPay(false)}>{pay ? <PayDialog c={c} onClose={() => setPay(false)} onDone={() => { setPay(false); reload(); }} /> : null}</Dlg>
      <Dlg open={edit} onClose={() => setEdit(false)} wide>{edit ? <CustomerDialog item={c} admin={admin} onClose={() => setEdit(false)} onDone={() => { setEdit(false); reload(); }} /> : null}</Dlg>
      <ConfirmDialog open={!!delPay} title="Eliminar abono" message="El saldo del cliente vuelve a subir. Úsalo solo si el abono se registró por error." confirmLabel="Eliminar" onConfirm={async () => { const p = delPay!; setDelPay(null); try { await api(`/ferre/payments/${p}`, { method: "DELETE" }); reload(); } catch (x) { setMsg(errMsg(x)); } }} onClose={() => setDelPay(null)} />
    </div>
  );
}
