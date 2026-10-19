"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { STATUS_TEXT, dateCO, kindIcon, niceDate } from "@/lib/taller";
import type { PublicTaller, TallerPortal, TallerStatus } from "@/lib/types";
import { Modal } from "./modal";
import { BookDialog, TALLER_LS, readCustomerToken, saveCustomerToken } from "./taller-public";

/** Portal del cliente: sus vehículos, lo que está en el taller, su historial y los próximos mantenimientos. */
export function TallerPortalView() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [token, setToken] = useState<string | null>(null);
  const [d, setD] = useState<TallerPortal | null>(null);
  const [pub, setPub] = useState<PublicTaller | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<string | null | false>(false);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("t") || readCustomerToken(host) || ""); }, [host]);
  const load = useCallback(async (t: string) => {
    try {
      const r = await api<TallerPortal>("/public/taller-customer", { method: "POST", body: JSON.stringify({ host, token: t }) });
      setD(r);
      if (!r.suspended) {
        saveCustomerToken(host, t);
        if (window.location.search) window.history.replaceState(null, "", "/mi-vehiculo");
        api<PublicTaller>(`/public/taller?host=${encodeURIComponent(host)}`).then(setPub).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido. Entra con tu placa y tu celular desde la página del taller." : e instanceof ApiError ? e.message : "No se pudo cargar tu información.");
      try { localStorage.removeItem(TALLER_LS(host)); } catch { /* */ }
    }
  }, [host]);
  useEffect(() => { if (token) void load(token); }, [token, load]);
  if (token === null) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (!token || error || (d && d.suspended)) {
    return <div className="landing"><div className="landing__card"><h1>Mi vehículo</h1>{d?.suspended ? <p className="landing__text" role="status">Este servicio está suspendido por el momento.</p> : <p className="landing__text" role="alert">{error ?? "Entra con tu placa y tu celular desde la página del taller."}</p>}<p className="field__hint"><Link href="/">← Ir a la página del taller</Link></p></div></div>;
  }
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  const phone = d.workshop?.phone ?? "";
  return (
    <div className="dcard vetpage">
      <header className="dcard__hero"><span className="dcard__photo dcard__photo--empty" aria-hidden="true">🔧</span><h1>Hola, {(d.customer?.name ?? "").split(" ")[0]}</h1><p className="dcard__veh">{d.workshop?.name}</p></header>
      <section className="tech__cta">
        <button type="button" className="btn btn--primary tech__big" onClick={() => setBook(null)}>Pedir una cita</button>
        {phone ? <a className="btn btn--secondary tech__big" href={`tel:${phone}`}>Llamar al taller</a> : null}
      </section>
      {d.vehicles.map((v) => (
        <section key={v.id} className="dcard__sec tl-veh" aria-label={`Vehículo ${v.plate}`}>
          <h2><span className="tl-plate"><i aria-hidden="true">{kindIcon(v.kind)}</i>{v.plate}</span> {v.label}</h2>
          <p className="field__hint">{v.km.toLocaleString("es-CO")} km{v.oil ? ` · aceite ${v.oil}` : ""}</p>
          {v.active.length ? (
            <div><h3>En el taller ahora</h3>
              <ul className="dcard__list">{v.active.map((o) => <li key={o.id}><div><b>Orden #{o.number}</b><p>{o.complaint}</p><p><span className={`badge badge--${STATUS_TEXT[o.status as TallerStatus]?.tone === "ok" ? "ok" : STATUS_TEXT[o.status as TallerStatus]?.tone === "warn" ? "warn" : "info"}`}>{STATUS_TEXT[o.status as TallerStatus]?.label}</span></p></div>
                <a className={`btn btn--${o.quoteStatus === "enviada" ? "primary" : "secondary"} btn--sm`} href={o.url}>{o.quoteStatus === "enviada" ? "Ver y aprobar cotización" : "Ver seguimiento"}</a></li>)}</ul></div>
          ) : null}
          <div><h3>Próximos mantenimientos</h3>
            {!v.reminders.length ? <p className="field__hint">Por ahora no tienes mantenimientos programados.</p> : <ul className="dcard__list">{v.reminders.map((r) => <li key={r.id}><div><b>{r.serviceName}</b><p>{niceDate(r.dueDate)}{r.dueKm ? ` o a los ${r.dueKm.toLocaleString("es-CO")} km` : ""}</p></div>{r.overdue ? <span className="badge badge--warn">Vencido</span> : <button className="btn btn--secondary btn--sm" onClick={() => setBook(r.serviceName)}>Agendar</button>}</li>)}</ul>}</div>
          <div><h3>Historial</h3>
            {!v.history.length ? <p className="field__hint">Aún no hay servicios entregados.</p> : <ul className="dcard__list">{v.history.map((h) => <li key={h.id}><div><b>{dateCO(h.date)} · {formatMoney(h.total)}</b><p>{h.items.slice(0, 4).join(", ")}{h.items.length > 4 ? "…" : ""}</p></div><a className="btn btn--secondary btn--sm" href={h.url}>Ver</a></li>)}</ul>}</div>
        </section>
      ))}
      {!d.vehicles.length ? <p className="field__hint">No tienes vehículos registrados.</p> : null}
      <p className="field__hint" style={{ textAlign: "center" }}>Este enlace es personal: no lo compartas.</p>
      <p className="landing__foot">Con tecnología de EzerPro</p>
      <Modal open={book !== false} onClose={() => setBook(false)}>{book !== false ? <BookDialog host={host} services={book ? [{ id: "x", name: book }] : pub?.services ?? []} prefill={{ name: d.customer?.name, plate: d.vehicles[0]?.plate }} onClose={() => setBook(false)} /> : null}</Modal>
    </div>
  );
}
