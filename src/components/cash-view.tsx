"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, PAY_LABEL, parsePesos } from "@/lib/format";
import type { CashClosed, CashCurrent } from "@/lib/types";
import { useSession } from "./session";
import { Modal } from "./modal";
import { NoAccess } from "./no-access";

function when(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function Methods({ by }: { by: Record<string, number> }) {
  const keys = Object.keys(by);
  if (keys.length === 0) return <span className="sub">Sin ventas</span>;
  return <>{keys.map((k) => `${PAY_LABEL[k] ?? k}: ${formatMoney(by[k])}`).join(" · ")}</>;
}

export function CashView() {
  const { state } = useSession();
  const allowed = state.status === "in" && (state.user.role === "TENANT_ADMIN" || state.user.role === "CASHIER");
  const cur = useResource<CashCurrent>(allowed ? "/cash/current" : null);
  const hist = useResource<CashClosed[]>(allowed ? "/cash/history" : null);
  const [openTxt, setOpenTxt] = useState("");
  const [closing, setClosing] = useState(false);
  const [countedTxt, setCountedTxt] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ expected: number; counted: number; diff: number; total: number } | null>(null);

  if (state.status === "in" && !allowed) return <NoAccess />;
  const c = cur.data;

  async function openCash() {
    setBusy(true);
    setErr(null);
    try {
      await api("/cash/open", { method: "POST", body: JSON.stringify({ openingAmount: parsePesos(openTxt) }) });
      setOpenTxt("");
      cur.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo abrir la caja.");
    } finally {
      setBusy(false);
    }
  }

  async function closeCash() {
    if (countedTxt.trim() === "") return setErr("Escribe cuánto efectivo hay en la caja.");
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ summary: { total: number }; expectedCash: number; countedCash: number; difference: number }>("/cash/close", {
        method: "POST",
        body: JSON.stringify({ countedAmount: parsePesos(countedTxt), note: note.trim() || undefined }),
      });
      setResult({ expected: r.expectedCash, counted: r.countedCash, diff: r.difference, total: r.summary.total });
      setClosing(false);
      setCountedTxt("");
      setNote("");
      cur.reload();
      hist.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo cerrar la caja.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Caja</h1>
          <p className="lede">Abre la caja al empezar el turno y ciérrala al terminar.</p>
        </div>
        {c?.open ? <button type="button" className="btn btn--primary" onClick={() => { setErr(null); setClosing(true); }}>Cerrar caja</button> : null}
      </header>

      {cur.error ? <div className="banner banner--error" role="alert"><span>{cur.error}</span></div> : null}

      {result ? (
        <div className={`banner ${result.diff === 0 ? "" : "banner--error"}`} role="status">
          <span>
            Caja cerrada. Vendiste {formatMoney(result.total)}. Efectivo esperado {formatMoney(result.expected)}, contado {formatMoney(result.counted)}:{" "}
            <strong>{result.diff === 0 ? "cuadra perfecto" : result.diff > 0 ? `sobran ${formatMoney(result.diff)}` : `faltan ${formatMoney(-result.diff)}`}</strong>.
          </span>
        </div>
      ) : null}

      {c && !c.open ? (
        <section className="account-card" style={{ maxWidth: 440, marginBottom: 24 }}>
          <h2>Abrir caja</h2>
          <p className="lede">Escribe el efectivo con el que empiezas (la base).</p>
          <div className="field">
            <label htmlFor="cash-open">Base de caja (pesos)</label>
            <input id="cash-open" type="text" inputMode="numeric" autoComplete="off" value={openTxt} onChange={(e) => { setOpenTxt(e.target.value); setErr(null); }} />
            <p className="field__hint">{openTxt ? formatMoney(parsePesos(openTxt)) : "Puede ser 0."}</p>
          </div>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          <button type="button" className="btn btn--primary" onClick={openCash} disabled={busy}>{busy ? "Abriendo…" : "Abrir caja"}</button>
        </section>
      ) : null}

      {c?.open && c.shift && c.summary ? (
        <>
          <p className="lede" style={{ marginBottom: 12 }}>Abierta desde {when(c.shift.openedAt)}.</p>
          <div className="kpis" role="group" aria-label="Turno actual">
            <div className="kpi"><span className="kpi__value">{formatMoney(c.summary.total)}</span><span className="kpi__label">vendido en este turno ({c.summary.count} {c.summary.count === 1 ? "venta" : "ventas"})</span></div>
            <div className="kpi"><span className="kpi__value">{formatMoney(c.shift.openingAmount)}</span><span className="kpi__label">base de caja</span></div>
            <div className="kpi"><span className="kpi__value">{formatMoney(c.expectedCash ?? 0)}</span><span className="kpi__label">efectivo que debería haber</span></div>
          </div>
          <p className="field__hint" style={{ marginBottom: 24 }}><Methods by={c.summary.byMethod} /></p>
        </>
      ) : null}

      <h2 style={{ fontSize: 20, margin: "8px 0 12px" }}>Cierres anteriores</h2>
      {hist.data && hist.data.length === 0 ? <p className="field__hint">Todavía no hay cierres.</p> : null}
      {hist.data && hist.data.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Turno</th><th className="num-r">Vendido</th><th>Por forma de pago</th><th className="num-r">Diferencia</th></tr></thead>
            <tbody>
              {hist.data.map((h) => (
                <tr key={h.id}>
                  <td><div className="strong-t">{when(h.openedAt)}</div><div className="sub">hasta {when(h.closedAt)}{h.note ? ` · ${h.note}` : ""}</div></td>
                  <td className="num-r">{formatMoney(h.total)}</td>
                  <td><Methods by={h.byMethod} /></td>
                  <td className="num-r">{h.difference === 0 ? "Cuadra" : h.difference > 0 ? `+${formatMoney(h.difference)}` : `−${formatMoney(-h.difference)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal open={closing} onClose={() => setClosing(false)}>
        <h2 id="dlg-title" tabIndex={-1}>Cerrar caja</h2>
        <p className="lede">Cuenta el efectivo que hay en la caja. Yo te digo si cuadra con lo vendido.</p>
        <div className="field">
          <label htmlFor="cash-count">Efectivo contado (pesos)</label>
          <input id="cash-count" type="text" inputMode="numeric" autoComplete="off" value={countedTxt} onChange={(e) => { setCountedTxt(e.target.value); setErr(null); }} />
          <p className="field__hint">{countedTxt ? formatMoney(parsePesos(countedTxt)) : ""}</p>
        </div>
        <div className="field"><label htmlFor="cash-note">Nota (opcional)</label><input id="cash-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={() => setClosing(false)}>Cancelar</button>
          <button type="button" className="btn btn--primary" onClick={closeCash} disabled={busy}>{busy ? "Cerrando…" : "Cerrar caja"}</button>
        </div>
      </Modal>
    </div>
  );
}
