"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, parsePesos, roleLabel } from "@/lib/format";
import { labelDate, rangeOf, todayCO, stampCO, type Range } from "@/lib/dates";
import { downloadXlsx } from "@/lib/excel";
import { PeriodPicker } from "./period-picker";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { useSession } from "./session";
import { NoAccess } from "./no-access";
import type { PayrollDetail, PayrollResponse, PayrollRow, PayType } from "@/lib/types";

const TYPE_TEXT: Record<PayType, string> = { hora: "por hora", dia: "por día", domicilio: "por domicilio", rutina: "por rutina" };
const UNIT_TEXT: Record<PayType, string> = { hora: "h", dia: "días", domicilio: "entregas", rutina: "rutinas" };
const METHOD_LABEL: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia", otro: "Otro" };

function rateText(r: { payType: PayType | null; payRate: number }) {
  return r.payType ? `${formatMoney(r.payRate)} ${TYPE_TEXT[r.payType]}` : "Sin configurar";
}
function num(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(n);
}

type Dlg =
  | null
  | { kind: "config"; row: PayrollRow }
  | { kind: "work"; row: PayrollRow }
  | { kind: "pay"; row: PayrollRow }
  | { kind: "detail"; row: PayrollRow };

function ConfigForm({ row, onClose, onSaved }: { row: PayrollRow; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<PayType | "">(row.payType ?? "");
  const [rate, setRate] = useState(row.payRate ? String(row.payRate) : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isDriver = row.role === "DRIVER";
  const sessP = useSession();
  const isGymP = sessP.state.status === "in" && !!sessP.state.user.tenant?.modules?.includes("gimnasio");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (!type) await api(`/payroll/employee/${row.id}`, { method: "PUT", body: JSON.stringify({ payType: null }) });
      else {
        const n = parsePesos(rate);
        if (n <= 0) throw new ApiError(400, "Escribe cuánto se le paga (en pesos).");
        await api(`/payroll/employee/${row.id}`, { method: "PUT", body: JSON.stringify({ payType: type, payRate: n }) });
      }
      onSaved();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Cómo se le paga a {row.name ?? row.email}</h2>
      <div className="field">
        <label htmlFor="pc-type">Forma de pago</label>
        <select id="pc-type" value={type} onChange={(e) => setType(e.target.value as PayType | "")}>
          <option value="">Sin configurar</option>
          <option value="hora">Por hora</option>
          <option value="dia">Por día</option>
          {isDriver ? <option value="domicilio">Por domicilio entregado</option> : null}
          {row.role === "EMPLOYEE" && isGymP ? <option value="rutina">Por rutina asignada</option> : null}
        </select>
      </div>
      {type ? (
        <div className="field">
          <label htmlFor="pc-rate">Valor {type === "hora" ? "de cada hora" : type === "dia" ? "de cada día" : type === "rutina" ? "de cada rutina asignada" : "de cada domicilio"} (pesos)</label>
          <input id="pc-rate" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} />
          <p className="field__hint">Si después cambias el valor, lo ya registrado se queda como estaba.</p>
        </div>
      ) : null}
      <div role="alert">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

function WorkForm({ row, onClose, onSaved }: { row: PayrollRow; onClose: () => void; onSaved: () => void }) {
  const hour = row.payType === "hora";
  const [date, setDate] = useState(todayCO());
  const [units, setUnits] = useState(hour ? "" : "1");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const n = Number(units.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return setErr(hour ? "Escribe las horas trabajadas." : "Elige cuánto trabajó.");
    setBusy(true);
    try {
      await api("/payroll/work", { method: "POST", body: JSON.stringify({ userId: row.id, date, units: n, note: note.trim() || undefined }) });
      onSaved();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }
  const n = Number(units.replace(",", "."));
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{hour ? "Registrar horas" : "Registrar día trabajado"} · {row.name ?? row.email}</h2>
      <div className="field-row">
        <div className="field">
          <label htmlFor="pw-date">Fecha</label>
          <input id="pw-date" type="date" value={date} max={todayCO()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          {hour ? (
            <>
              <label htmlFor="pw-units">Horas trabajadas</label>
              <input id="pw-units" inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="Ej: 7,5" />
            </>
          ) : (
            <>
              <label htmlFor="pw-units">Jornada</label>
              <select id="pw-units" value={units} onChange={(e) => setUnits(e.target.value)}>
                <option value="1">Día completo</option>
                <option value="0.5">Medio día</option>
              </select>
            </>
          )}
        </div>
      </div>
      <div className="field">
        <label htmlFor="pw-note">Nota (opcional)</label>
        <input id="pw-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {Number.isFinite(n) && n > 0 ? <p className="field__hint">Se registran {formatMoney(Math.round(n * row.payRate))} ({rateText(row)}).</p> : null}
      <div role="alert">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Registrar"}</button>
      </div>
    </form>
  );
}

function PayForm({ row, onClose, onSaved }: { row: PayrollRow; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(Math.max(0, row.balance)));
  const [method, setMethod] = useState("efectivo");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const n = parsePesos(amount);
    if (n <= 0) return setErr("Escribe cuánto vas a pagar.");
    if (n > row.balance) return setErr(`Solo le debes ${formatMoney(row.balance)}.`);
    setBusy(true);
    try {
      await api("/payroll/pay", { method: "POST", body: JSON.stringify({ userId: row.id, amount: n, method, note: note.trim() || undefined }) });
      onSaved();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Pagar a {row.name ?? row.email}</h2>
      <p className="lede">Saldo pendiente: <strong>{formatMoney(row.balance)}</strong></p>
      <div className="field-row">
        <div className="field">
          <label htmlFor="pp-amount">Valor a pagar (pesos)</label>
          <input id="pp-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pp-method">Forma de pago</label>
          <select id="pp-method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="pp-note">Nota (opcional)</label>
        <input id="pp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: quincena, adelanto…" />
      </div>
      <div role="alert">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Registrar pago"}</button>
      </div>
    </form>
  );
}

function Detail({ row, range, onChanged, onClose }: { row: PayrollRow; range: Range; onChanged: () => void; onClose: () => void }) {
  const { data, error, reload } = useResource<PayrollDetail>(`/payroll/employee/${row.id}?from=${range.from}&to=${range.to}`);
  const [confirm, setConfirm] = useState<{ kind: "work" | "pay"; id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    if (!confirm) return;
    setBusy(true);
    setErr(null);
    try {
      await api(confirm.kind === "work" ? `/payroll/work/${confirm.id}` : `/payroll/payments/${confirm.id}`, { method: "DELETE" });
      setConfirm(null);
      reload();
      onChanged();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "No se pudo anular.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>Detalle de {row.name ?? row.email}</h2>
      <p className="lede">{labelDate(range.from)} – {labelDate(range.to)} · Saldo pendiente total: <strong>{formatMoney(data?.balance ?? row.balance)}</strong></p>
      {error ? <p className="form-error">{error}</p> : null}
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {data ? (
        <>
          {data.work.length > 0 ? (
            <>
              <h3 className="section-title">Trabajo registrado</h3>
              <ul className="ledger">
                {data.work.map((w) => (
                  <li key={w.id}>
                    <span>{labelDate(w.workDate)} · {num(w.units)} {row.payType === "hora" ? "h" : "día(s)"}{w.note ? ` · ${w.note}` : ""}</span>
                    <strong>{formatMoney(w.amount)}</strong>
                    <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setConfirm({ kind: "work", id: w.id, text: "Se borrará este registro de trabajo." })}>Borrar</button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {data.routines && data.routines.length > 0 ? (
            <>
              <h3 className="section-title">Rutinas asignadas</h3>
              <ul className="ledger">
                {data.routines.map((x) => (
                  <li key={x.id}><span>{stampCO(x.createdAt)} · {x.title}{x.memberName ? ` · ${x.memberName}` : ""}</span><strong>{formatMoney(x.pay)}</strong><span /></li>
                ))}
              </ul>
            </>
          ) : null}
          {data.deliveries.length > 0 ? (
            <>
              <h3 className="section-title">Domicilios entregados</h3>
              <ul className="ledger">
                {data.deliveries.map((d) => (
                  <li key={d.id}><span>Pedido #{d.number} · {stampCO(d.deliveredAt)}</span><strong>{formatMoney(d.driverPay)}</strong><span /></li>
                ))}
              </ul>
            </>
          ) : null}
          <h3 className="section-title">Pagos hechos</h3>
          {data.payments.length === 0 ? <p className="field__hint">No hay pagos en este periodo.</p> : (
            <ul className="ledger">
              {data.payments.map((p) => (
                <li key={p.id}>
                  <span>{stampCO(p.paidAt)} · {METHOD_LABEL[p.method ?? "otro"] ?? p.method}{p.note ? ` · ${p.note}` : ""}</span>
                  <strong>{formatMoney(p.amount)}</strong>
                  <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setConfirm({ kind: "pay", id: p.id, text: "Se anulará este pago y el valor vuelve a quedar como pendiente." })}>Anular</button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button>
      </div>
      <ConfirmDialog open={confirm !== null} title="¿Seguro?" message={confirm?.text ?? ""} confirmLabel="Sí, continuar" busy={busy} onConfirm={remove} onClose={() => setConfirm(null)} />
    </div>
  );
}

export function PayrollView() {
  const { state } = useSession();
  const allowed = state.status === "in" && state.user.role === "TENANT_ADMIN";
  const [range, setRange] = useState<Range>(() => rangeOf("mes"));
  const [dlg, setDlg] = useState<Dlg>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const { data, error, reload } = useResource<PayrollResponse>(allowed ? `/payroll?from=${range.from}&to=${range.to}` : null);
  if (state.status === "in" && !allowed) return <NoAccess />;

  const close = () => setDlg(null);
  const done = (msg: string) => { close(); setNote(msg); reload(); };

  async function exportExcel() {
    if (!data) return;
    setErr(null);
    try {
      const head = (t: string) => ({ value: t, bold: true });
      await downloadXlsx(`nomina_${range.from}_a_${range.to}.xlsx`, [
        {
          name: "Nómina",
          widths: [26, 16, 22, 12, 16, 16, 16],
          rows: [
            [{ value: `Nómina del ${range.from} al ${range.to}`, bold: true }],
            [],
            ["Empleado", "Cargo", "Pago", "Cantidad", "Ganado", "Pagado", "Saldo pendiente"].map(head),
            ...data.items.map((r) => [
              r.name ?? r.email,
              roleLabel(r.role),
              rateText(r),
              r.payType ? `${num(r.units)} ${UNIT_TEXT[r.payType]}` : "",
              { value: r.earnedPeriod, money: true },
              { value: r.paidPeriod, money: true },
              { value: r.balance, money: true },
            ]),
            [],
            [{ value: "TOTAL", bold: true }, "", "", "", { value: data.totals.earnedPeriod, money: true, bold: true }, { value: data.totals.paidPeriod, money: true, bold: true }, { value: data.totals.balance, money: true, bold: true }],
          ],
        },
      ]);
    } catch {
      setErr("No se pudo generar el archivo de Excel.");
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Nómina</h1>
          <p className="lede">Lo que ganan tus empleados, lo que ya les pagaste y lo que les debes.</p>
        </div>
        <button type="button" className="btn btn--secondary" disabled={!data || data.items.length === 0} onClick={exportExcel}>Descargar Excel</button>
      </header>
      <PeriodPicker value={range} onChange={setRange} />
      {error ? <div className="banner banner--error" role="alert"><span>{error}</span></div> : null}
      {err ? <div className="banner banner--error" role="alert"><span>{err}</span></div> : null}
      {note ? <div className="banner" role="status"><span>{note}</span></div> : null}

      {data ? (
        <div className="kpis" role="group" aria-label="Resumen de nómina">
          <div className="kpi"><span className="kpi__value">{formatMoney(data.totals.earnedPeriod)}</span><span className="kpi__label">ganado en el periodo</span></div>
          <div className="kpi"><span className="kpi__value">{formatMoney(data.totals.paidPeriod)}</span><span className="kpi__label">pagado en el periodo</span></div>
          <div className="kpi"><span className="kpi__value">{formatMoney(data.totals.balance)}</span><span className="kpi__label">pendiente por pagar (total)</span></div>
        </div>
      ) : null}

      {data && data.items.length === 0 ? (
        <section className="note"><h2>Aún no tienes empleados</h2><p>Créalos en Equipo y luego configura aquí cómo se les paga.</p></section>
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Empleado</th><th>Pago</th><th className="num">Cantidad</th><th className="num">Ganado</th><th className="num">Pagado</th><th className="num">Pendiente</th><th><span className="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="strong-t">{r.name ?? r.email}{r.status !== "active" ? " (desactivado)" : ""}</div>
                    <div className="sub">{roleLabel(r.role)}</div>
                  </td>
                  <td>{rateText(r)}</td>
                  <td className="num">{r.payType ? `${num(r.units)} ${UNIT_TEXT[r.payType]}` : "—"}</td>
                  <td className="num">{formatMoney(r.earnedPeriod)}</td>
                  <td className="num">{formatMoney(r.paidPeriod)}</td>
                  <td className="num"><strong>{formatMoney(r.balance)}</strong></td>
                  <td>
                    <div className="actions-cell">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "config", row: r })}>Configurar pago</button>
                      {r.payType === "hora" || r.payType === "dia" ? (
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "work", row: r })}>{r.payType === "hora" ? "Registrar horas" : "Registrar día"}</button>
                      ) : null}
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "detail", row: r })}>Detalle</button>
                      {r.balance > 0 ? <button type="button" className="btn btn--primary btn--sm" onClick={() => setDlg({ kind: "pay", row: r })}>Pagar</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal open={dlg?.kind === "config"} onClose={close}>
        {dlg?.kind === "config" ? <ConfigForm row={dlg.row} onClose={close} onSaved={() => done("Forma de pago guardada.")} /> : null}
      </Modal>
      <Modal open={dlg?.kind === "work"} onClose={close}>
        {dlg?.kind === "work" ? <WorkForm row={dlg.row} onClose={close} onSaved={() => done("Trabajo registrado.")} /> : null}
      </Modal>
      <Modal open={dlg?.kind === "pay"} onClose={close}>
        {dlg?.kind === "pay" ? <PayForm row={dlg.row} onClose={close} onSaved={() => done("Pago registrado.")} /> : null}
      </Modal>
      <Modal open={dlg?.kind === "detail"} onClose={close} wide>
        {dlg?.kind === "detail" ? <Detail row={dlg.row} range={range} onChanged={reload} onClose={close} /> : null}
      </Modal>
    </div>
  );
}
