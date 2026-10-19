"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { METHODS, dueText, niceDate, waLink } from "@/lib/gym";
import { dateCO, timeCO } from "@/lib/vet";
import type { GymMemberDetail, GymRoutine } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { MemberAvatar, StateBadge, useGymAccess } from "./gym-common";
import { MemberDialog, PayDialog } from "./gym-members";
import { RoutineDialog } from "./gym-routines";

export function GymMemberView({ id }: { id: string }) {
  const { state, allowed, role } = useGymAccess(["TENANT_ADMIN", "CASHIER"]);
  const { data, error, reload } = useResource<GymMemberDetail>(allowed ? `/gym/members/${id}` : null);
  const [dlg, setDlg] = useState<{ k: "edit" } | { k: "pay" } | { k: "routine"; r: GymRoutine | null } | { k: "delpay"; id: string } | { k: "delroutine"; id: string } | { k: "baja" } | { k: "del" } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  if (error) return <div className="page"><p className="form-error" role="alert">{error}</p><Link href="/socios">Volver a socios</Link></div>;
  if (!data) return <div className="page"><p className="lede" role="status">Cargando…</p></div>;
  const { member: m, payments, checkins, routines } = data;
  const admin = role === "TENANT_ADMIN";
  const done = () => { setDlg(null); reload(); };
  const fail = (x: unknown) => { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); };
  const methodLabel = (v: string) => METHODS.find((x) => x.v === v)?.l ?? v;

  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setMsg(`${what} copiado.`); setErr(null); } catch { setErr("No se pudo copiar."); }
  }
  async function sendAccess() {
    setMsg(null); setErr(null);
    try { await api(`/gym/members/${m.id}/send-access`, { method: "POST" }); setMsg(`Enviamos el acceso a ${m.email}.`); } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  async function baja() {
    try { await api(`/gym/members/${m.id}`, { method: "PATCH", body: JSON.stringify({ archived: !m.archived }) }); done(); } catch (x) { fail(x); }
  }
  async function del() {
    try { await api(`/gym/members/${m.id}`, { method: "DELETE" }); window.location.href = "/socios"; } catch (x) { fail(x); }
  }
  async function delPay() {
    if (dlg?.k !== "delpay") return;
    try { await api(`/gym/payments/${dlg.id}`, { method: "DELETE" }); done(); } catch (x) { fail(x); }
  }
  async function delRoutine() {
    if (dlg?.k !== "delroutine") return;
    try { await api(`/gym/routines/${dlg.id}`, { method: "DELETE" }); done(); } catch (x) { fail(x); }
  }

  return (
    <div className="page">
      <p><Link href="/socios">← Socios</Link></p>
      <div className="page-head">
        <div className="pet-head"><MemberAvatar m={m} size={72} /><div><h1>{m.name} {m.archived ? <span className="badge badge--info">De baja</span> : null}</h1>
          <p className="lede"><StateBadge state={m.state} /> {m.planName ?? "Sin plan"} · {dueText(m.daysLeft, m.paidUntil)}{m.paidUntil ? ` (${niceDate(m.paidUntil)})` : ""}</p></div></div>
        <div className="actions-cell">
          {!m.archived ? <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "pay" })}>Cobrar membresía</button> : null}
          <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "edit" })}>Editar</button>
        </div>
      </div>
      {msg ? <p className="note" role="status">{msg}</p> : null}
      {err ? <p className="form-error" role="alert">{err}</p> : null}

      <div className="vet-grid">
        <section className="dcard__sec" aria-label="Datos del socio">
          <h2>Datos</h2>
          <dl className="pet-facts">
            <dt>Celular</dt><dd>{m.phone}</dd>
            <dt>Correo</dt><dd>{m.email ?? "—"}</dd>
            <dt>Documento</dt><dd>{m.document ?? "—"}</dd>
            <dt>Código</dt><dd><b>{m.code}</b></dd>
            <dt>Notas</dt><dd>{m.notes ?? "—"}</dd>
          </dl>
          <h2>Portal del socio</h2>
          <p className="field__hint">Con su enlace personal ve su QR de entrada, su membresía, sus rutinas y reserva clases.</p>
          <div className="actions-cell">
            <a className="btn btn--secondary btn--sm" href={waLink(m.phone, `Hola ${m.name.split(" ")[0]}, este es tu acceso personal (QR de entrada, rutinas y clases): ${m.portalUrl}`)} target="_blank" rel="noreferrer">Enviar por WhatsApp</a>
            {m.email ? <button className="btn btn--secondary btn--sm" onClick={sendAccess}>Enviar por correo</button> : null}
            <button className="btn btn--secondary btn--sm" onClick={() => copy(m.portalUrl, "Enlace del portal")}>Copiar enlace</button>
          </div>
        </section>

        <section className="dcard__sec" aria-label="Entradas recientes">
          <h2>Entradas recientes</h2>
          {!checkins.length ? <p className="field__hint">Aún no ha entrado.</p> : null}
          <ul className="dcard__list">
            {checkins.slice(0, 10).map((c) => <li key={c.id}><div><b>{niceDate(dateCO(c.at))}</b><p>{timeCO(c.at)}</p></div><span className={`badge ${c.ok ? "badge--ok" : "badge--warn"}`}>{c.ok ? "Entró" : "Rechazado"}</span></li>)}
          </ul>
        </section>
      </div>

      <section className="dcard__sec" aria-label="Pagos">
        <h2>Pagos de membresía</h2>
        {!payments.length ? <p className="field__hint">Aún no hay pagos.</p> : null}
        <ul className="ledger">
          {payments.map((p) => (
            <li key={p.id}>
              <span>{niceDate(dateCO(p.paidAt))} · {p.planName} · {methodLabel(p.method)}<br /><span className="field__hint">Cubre del {niceDate(p.periodStart)} al {niceDate(p.periodEnd)}{p.note ? ` · ${p.note}` : ""}</span></span>
              <strong>{formatMoney(p.amount)}</strong>
              {admin ? <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delpay", id: p.id })}>Anular</button> : <span />}
            </li>
          ))}
        </ul>
      </section>

      <section className="dcard__sec" aria-label="Rutinas">
        <div className="page-head"><h2>Rutinas</h2>{admin ? <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "routine", r: null })}>Nueva rutina</button> : null}</div>
        {!routines.length ? <p className="field__hint">Aún no tiene rutinas asignadas.</p> : null}
        <ul className="routine-list">
          {routines.map((r) => (
            <li key={r.id} className="routine"><div><b>{r.title}</b> <span className="field__hint">{niceDate(dateCO(r.createdAt))}{r.trainerName ? ` · ${r.trainerName}` : ""}</span><pre>{r.body}</pre></div>
              {admin ? <div className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "routine", r })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delroutine", id: r.id })}>Quitar</button></div> : null}</li>
          ))}
        </ul>
      </section>

      {admin ? (
        <p className="actions-cell">
          <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "baja" })}>{m.archived ? "Reactivar socio" : "Dar de baja"}</button>
          <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del" })}>Eliminar socio</button>
        </p>
      ) : null}

      <Modal open={dlg?.k === "edit"} onClose={() => setDlg(null)} wide>{dlg?.k === "edit" ? <MemberDialog member={m} onClose={() => setDlg(null)} onDone={done} /> : null}</Modal>
      <Modal open={dlg?.k === "pay"} onClose={() => setDlg(null)}>{dlg?.k === "pay" ? <PayDialog member={m} onClose={() => setDlg(null)} onDone={done} /> : null}</Modal>
      <Modal open={dlg?.k === "routine"} onClose={() => setDlg(null)} wide>{dlg?.k === "routine" ? <RoutineDialog routine={dlg.r} memberId={m.id} onClose={() => setDlg(null)} onDone={done} /> : null}</Modal>
      <ConfirmDialog open={dlg?.k === "delpay"} title="Anular pago" message="Solo se puede anular el último pago. El vencimiento vuelve al que tenía antes." confirmLabel="Sí, anular" onConfirm={delPay} onClose={() => setDlg(null)} />
      <ConfirmDialog open={dlg?.k === "delroutine"} title="Quitar rutina" message="¿Quitar esta rutina? Se descuenta del pago del entrenador." confirmLabel="Sí, quitar" onConfirm={delRoutine} onClose={() => setDlg(null)} />
      <ConfirmDialog open={dlg?.k === "baja"} title={m.archived ? "Reactivar socio" : "Dar de baja"} message={m.archived ? `¿Reactivar a ${m.name}?` : `${m.name} ya no podrá entrar ni usar su portal. Conservas su historial.`} confirmLabel="Sí" onConfirm={baja} onClose={() => setDlg(null)} />
      <ConfirmDialog open={dlg?.k === "del"} title="Eliminar socio" message={`¿Eliminar a ${m.name} con su historial de entradas y rutinas? Los pagos se conservan en los ingresos. No se puede deshacer.`} confirmLabel="Sí, eliminar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
