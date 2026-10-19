"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { dateCO, niceDate, waLink } from "@/lib/ferre";
import type { FerreAccount } from "@/lib/types";
import { FERRE_LS, readAccountToken, saveAccountToken } from "./ferre-public";

/** Estado de cuenta del cliente: lo que debe, lo vencido, sus facturas y abonos. */
export function FerreAccountPage() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [token, setToken] = useState<string | null>(null);
  const [d, setD] = useState<FerreAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("t") || readAccountToken(host) || ""); }, [host]);
  const load = useCallback(async (t: string) => {
    try {
      const r = await api<FerreAccount>("/public/ferre-account", { method: "POST", body: JSON.stringify({ host, t }) });
      setD(r);
      if (!r.suspended) { saveAccountToken(host, t); if (window.location.search) window.history.replaceState(null, "", "/mi-cuenta"); }
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido. Entra con tu cédula y tu celular desde la página de la ferretería." : e instanceof ApiError ? e.message : "No se pudo cargar tu cuenta.");
      try { localStorage.removeItem(FERRE_LS(host)); } catch { /* */ }
    }
  }, [host]);
  useEffect(() => { if (token) void load(token); }, [token, load]);
  if (token === null) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (!token || error || (d && d.suspended)) {
    return <div className="landing"><div className="landing__card"><h1>Mi cuenta</h1>{d?.suspended ? <p className="landing__text" role="status">Este servicio está suspendido por el momento.</p> : <p className="landing__text" role="alert">{error ?? "Entra con tu cédula y tu celular desde la página de la ferretería."}</p>}<p className="field__hint"><Link href="/">← Ir a la ferretería</Link></p></div></div>;
  }
  if (!d || !d.shop || !d.customer) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  const s = d.shop;
  return (
    <div className="dcard vetpage">
      <header className="dcard__hero"><span className="dcard__photo dcard__photo--empty" aria-hidden="true">🧾</span><h1>Hola, {d.customer.name.split(" ")[0]}</h1><p className="dcard__veh">{s.name}</p></header>
      <div className="kpis" role="group" aria-label="Resumen de tu cuenta">
        <div className="kpi"><span>Debes</span><strong>{formatMoney(d.balance)}</strong></div>
        <div className="kpi kpi--warn"><span>Vencido</span><strong>{formatMoney(d.overdue)}</strong></div>
        <div className="kpi"><span>Cupo disponible</span><strong>{formatMoney(d.available)}</strong></div>
      </div>
      <p className="field__hint" style={{ textAlign: "center" }}>Cupo de {formatMoney(d.customer.creditLimit)} · plazo de {d.customer.creditDays} días</p>
      <section className="tech__cta no-print">
        {s.phone ? <a className="btn btn--primary tech__big" href={waLink(s.phone, `Hola, soy ${d.customer.name}. Quiero coordinar el pago de mi saldo de ${formatMoney(d.balance)}.`)} target="_blank" rel="noreferrer">Coordinar mi pago por WhatsApp</a> : null}
        <Link className="btn btn--secondary tech__big" href="/catalogo">Pedir una cotización</Link>
        <button type="button" className="btn btn--secondary" onClick={() => window.print()}>Imprimir estado de cuenta</button>
      </section>
      <section className="dcard__sec" aria-label="Facturas pendientes"><h2>Facturas pendientes</h2>
        {!d.charges.length ? <p className="field__hint">¡Estás al día!</p> : <ul className="dcard__list">{d.charges.map((c) => <li key={c.number}><div><b>Venta #{c.number} · {formatMoney(c.open)}</b><p>De {formatMoney(c.total)} · {dateCO(c.date)} · vence {niceDate(c.dueDate)}</p></div>{c.overdue ? <span className="badge badge--warn">Vencida</span> : <span className="badge badge--ok">Al día</span>}</li>)}</ul>}
      </section>
      <section className="dcard__sec" aria-label="Movimientos"><h2>Movimientos</h2>
        <ul className="dcard__list">{[...d.statement].reverse().map((l, i) => <li key={i}><div><b>{l.ref}</b><p>{dateCO(l.at)}</p></div><span className={l.amount < 0 ? "is-ok" : ""}>{l.amount < 0 ? "−" : ""}{formatMoney(Math.abs(l.amount))}<br /><small>Saldo {formatMoney(l.balance)}</small></span></li>)}</ul>
      </section>
      {d.quotes.length ? <section className="dcard__sec no-print" aria-label="Cotizaciones"><h2>Mis cotizaciones</h2><ul className="dcard__list">{d.quotes.map((q) => <li key={q.number}><div><b>Cotización #{q.number}</b><p>{formatMoney(q.total)}</p></div><a className="btn btn--secondary btn--sm" href={q.url}>Ver</a></li>)}</ul></section> : null}
      <p className="field__hint" style={{ textAlign: "center" }}>Este enlace es personal: no lo compartas.</p>
      <p className="landing__foot">Con tecnología de EzerPro</p>
    </div>
  );
}
