"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, parsePesos } from "@/lib/format";
import { RIDE_STATUS, formatPhone, waNumber } from "@/lib/rides";
import type { DriverData, Ride } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { useSession } from "./session";
import { NoAccess } from "./no-access";

type Dlg = { kind: "offer"; ride: Ride } | { kind: "complete"; ride: Ride } | { kind: "cancel"; ride: Ride } | null;

function OfferDialog({ ride, rates, onClose, onDone }: { ride: Ride; rates: DriverData["profile"] | undefined; onClose: () => void; onDone: () => void }) {
  const [kmTxt, setKmTxt] = useState(ride.km ? String(ride.km).replace(".", ",") : "");
  const [priceTxt, setPriceTxt] = useState(ride.price ? String(ride.price) : "");
  const [hint, setHint] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const km = Number(kmTxt.replace(",", "."));
  const price = parsePesos(priceTxt);

  async function suggest() {
    setErr(null);
    if (!Number.isFinite(km) || km <= 0) return setErr("Escribe los kilómetros del recorrido.");
    try {
      const q = await api<{ suggested: number; perKm: number; baseFee: number; minFare: number; extrasTotal: number }>(`/rides/${ride.id}/quote?km=${km}`);
      setPriceTxt(String(q.suggested));
      setHint(`Base ${formatMoney(q.baseFee)} + ${km} km × ${formatMoney(q.perKm)}${q.extrasTotal ? ` + extras ${formatMoney(q.extrasTotal)}` : ""} (mínimo ${formatMoney(q.minFare)})`);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "No se pudo calcular.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!price || price < 1) return setErr("Escribe el precio que propones.");
    setBusy(true);
    try {
      await api(`/rides/${ride.id}/offer`, {
        method: "POST",
        body: JSON.stringify({ amount: price, km: Number.isFinite(km) && km > 0 ? km : null, note: note.trim() || null }),
      });
      onDone();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{ride.offeredBy === "pasajero" ? "Contraoferta" : "Cotizar el servicio"}</h2>
      <p className="lede">{ride.pickup} → {ride.dropoff}{ride.offeredBy === "pasajero" && ride.price ? ` · El pasajero ofrece ${formatMoney(ride.price)}` : ""}</p>
      <div className="field">
        <label htmlFor="o-km">Kilómetros del recorrido</label>
        <div className="field-row">
          <input id="o-km" type="text" inputMode="decimal" value={kmTxt} autoComplete="off" onChange={(e) => { setKmTxt(e.target.value); setErr(null); }} />
          <button type="button" className="btn btn--secondary" onClick={suggest}>Calcular precio</button>
        </div>
        {rates ? <p className="field__hint">Tu tarifa: {formatMoney(rates.baseFee)} + {formatMoney(rates.perKm)} por km (mínimo {formatMoney(rates.minFare)})</p> : null}
      </div>
      <div className="field">
        <label htmlFor="o-price">Precio que propones (pesos)</label>
        <input id="o-price" type="text" inputMode="numeric" value={priceTxt} autoComplete="off" onChange={(e) => { setPriceTxt(e.target.value); setErr(null); }} />
        <p className="field__hint">{price ? formatMoney(price) : "Puedes ajustar el valor sugerido."}{hint ? ` · ${hint}` : ""}</p>
      </div>
      <div className="field">
        <label htmlFor="o-note">Mensaje (opcional)</label>
        <input id="o-note" type="text" maxLength={160} value={note} autoComplete="off" onChange={(e) => setNote(e.target.value)} />
      </div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Enviar oferta"}</button>
      </div>
    </form>
  );
}

function CompleteDialog({ ride, onClose, onDone }: { ride: Ride; onClose: () => void; onDone: () => void }) {
  const [txt, setTxt] = useState(String(ride.finalPrice ?? ride.price ?? ""));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const v = parsePesos(txt);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v) return setErr("Escribe el valor cobrado.");
    setBusy(true);
    try {
      await api(`/rides/${ride.id}/complete`, { method: "POST", body: JSON.stringify({ finalPrice: v }) });
      onDone();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Terminar servicio</h2>
      <p className="lede">Confirma cuánto cobraste. Queda guardado en tu historial y ganancias.</p>
      <div className="field">
        <label htmlFor="c-val">Valor cobrado (pesos)</label>
        <input id="c-val" type="text" inputMode="numeric" value={txt} autoComplete="off" onChange={(e) => { setTxt(e.target.value); setErr(null); }} />
        <p className="field__hint">{v ? formatMoney(v) : "Sin puntos ni comas"}</p>
      </div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Volver</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Terminar y guardar"}</button>
      </div>
    </form>
  );
}

export function RequestsView() {
  const { state } = useSession();
  const allowed = state.status === "in" && state.user.role === "TENANT_ADMIN" && !!state.user.tenant?.modules?.includes("tarjeta");
  const { data, error, loading, reload } = useResource<Ride[]>(allowed ? "/rides?scope=open" : null);
  const prof = useResource<DriverData>(allowed ? "/driver/profile" : null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Las solicitudes nuevas aparecen solas, sin tener que recargar la página.
  useEffect(() => {
    if (!allowed) return;
    const t = setInterval(() => { if (!document.hidden) { reload(); } }, 8000);
    return () => clearInterval(t);
  }, [allowed, reload]);

  const act = useCallback(async (r: Ride, action: "accept" | "start") => {
    setBusyId(r.id);
    setErr(null);
    try {
      await api(`/rides/${r.id}/${action}`, { method: "POST" });
      reload();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      reload();
    } finally {
      setBusyId(null);
    }
  }, [reload]);

  async function toggleAvailable(v: boolean) {
    setErr(null);
    try {
      await api("/driver/profile", { method: "PATCH", body: JSON.stringify({ available: v }) });
      prof.reload();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
    }
  }

  async function doCancel() {
    if (dlg?.kind !== "cancel") return;
    setBusyId(dlg.ride.id);
    try {
      await api(`/rides/${dlg.ride.id}/cancel`, { method: "POST" });
      setDlg(null);
      reload();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setDlg(null);
    } finally {
      setBusyId(null);
    }
  }

  if (state.status === "in" && !allowed) return <NoAccess />;
  const available = prof.data?.profile.available ?? true;
  const done = () => { setDlg(null); reload(); };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Solicitudes</h1>
          <p className="lede">Los pasajeros que te piden un servicio aparecen aquí. Se actualiza sola.</p>
        </div>
        <div className="seg" role="group" aria-label="Disponibilidad">
          <button type="button" className={available ? "is-on" : ""} aria-pressed={available} onClick={() => toggleAvailable(true)}>Disponible</button>
          <button type="button" className={!available ? "is-on" : ""} aria-pressed={!available} onClick={() => toggleAvailable(false)}>No disponible</button>
        </div>
      </div>
      {!available ? <p className="banner">Estás como “No disponible”: los pasajeros no pueden pedirte servicios nuevos.</p> : null}
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      {loading && !data ? <p className="lede">Cargando…</p> : null}
      {data && data.length === 0 ? <p className="note">No tienes solicitudes abiertas. Comparte tu tarjeta o tu QR para recibirlas.</p> : null}
      <div className="ride-list">
        {(data ?? []).map((r) => {
          const st = RIDE_STATUS[r.status] ?? { label: r.status, tone: "info" as const };
          const myTurn = (r.status === "solicitado" && !r.offeredBy) || (r.status === "negociando" && r.offeredBy === "pasajero") || (r.status === "solicitado" && r.offeredBy === "pasajero");
          const waiting = (r.status === "negociando" || r.status === "solicitado") && r.offeredBy === "conductor";
          const busy = busyId === r.id;
          return (
            <article key={r.id} className="ride-card" data-status={r.status}>
              <header className="ride-card__head">
                <strong>#{r.number} · {r.serviceName ?? "Viaje"}</strong>
                <span className={`badge badge--${st.tone === "muted" ? "info" : st.tone}`}>{st.label}</span>
              </header>
              <p className="ride-card__route"><b>De:</b> {r.pickup}<br /><b>A:</b> {r.dropoff}</p>
              {r.notes ? <p className="ride-card__notes">“{r.notes}”</p> : null}
              {r.extras?.length ? <p className="field__hint">Extras: {r.extras.map((e) => e.name).join(", ")} ({formatMoney(r.extrasTotal)})</p> : null}
              <p className="ride-card__who">
                {r.passengerName} · <a href={`tel:${r.passengerPhone}`}>{formatPhone(r.passengerPhone)}</a> ·{" "}
                <a href={`https://wa.me/${waNumber(r.passengerPhone)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              </p>
              {r.price ? (
                <p className="ride-card__price">
                  {r.status === "aceptado" || r.status === "en_curso" ? "Precio acordado" : r.offeredBy === "pasajero" ? "El pasajero ofrece" : "Tu oferta"}: <b>{formatMoney(r.price)}</b>
                  {r.km ? ` · ${r.km} km` : ""}
                </p>
              ) : <p className="ride-card__price">Aún sin precio: cotiza el servicio.</p>}
              {waiting ? <p className="field__hint">Esperando respuesta del pasajero…</p> : null}
              <div className="actions-cell">
                {(r.status === "solicitado" || r.status === "negociando") && (
                  <>
                    {r.offeredBy === "pasajero" ? <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => act(r, "accept")}>Aceptar {formatMoney(r.price ?? 0)}</button> : null}
                    {myTurn || waiting ? <button className="btn btn--secondary btn--sm" disabled={busy} onClick={() => setDlg({ kind: "offer", ride: r })}>{r.offeredBy === "pasajero" ? "Contraofertar" : r.price ? "Cambiar oferta" : "Cotizar"}</button> : null}
                  </>
                )}
                {r.status === "aceptado" ? <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => act(r, "start")}>Iniciar servicio</button> : null}
                {r.status === "en_curso" ? <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => setDlg({ kind: "complete", ride: r })}>Terminar</button> : null}
                {r.status !== "en_curso" ? <button className="btn btn--danger-ghost btn--sm" disabled={busy} onClick={() => setDlg({ kind: "cancel", ride: r })}>Cancelar</button> : null}
              </div>
              {r.offers.length > 1 ? (
                <details className="ride-card__offers">
                  <summary>Ver negociación ({r.offers.length})</summary>
                  <ul>{r.offers.map((o, i) => <li key={i}>{o.by === "conductor" ? "Tú" : "Pasajero"}: {formatMoney(o.amount)}{o.note ? ` — ${o.note}` : ""}</li>)}</ul>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>
      <Modal open={dlg?.kind === "offer"} onClose={() => setDlg(null)}>
        {dlg?.kind === "offer" ? <OfferDialog ride={dlg.ride} rates={prof.data?.profile} onClose={() => setDlg(null)} onDone={done} /> : null}
      </Modal>
      <Modal open={dlg?.kind === "complete"} onClose={() => setDlg(null)}>
        {dlg?.kind === "complete" ? <CompleteDialog ride={dlg.ride} onClose={() => setDlg(null)} onDone={done} /> : null}
      </Modal>
      <ConfirmDialog
        open={dlg?.kind === "cancel"}
        title="Cancelar servicio"
        message="¿Seguro que quieres cancelar este servicio? Se le avisará al pasajero."
        confirmLabel="Sí, cancelar"
        busy={busyId !== null}
        onConfirm={doCancel}
        onClose={() => setDlg(null)}
      />
    </div>
  );
}
