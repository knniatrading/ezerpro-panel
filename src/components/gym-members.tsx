"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { photoToDataUrl } from "@/lib/image";
import { formatMoney, parsePesos } from "@/lib/format";
import { METHODS, dueText, memberPhoto, niceDate, todayCO } from "@/lib/gym";
import type { GymMember, GymMemberDetail, GymPlanItem, GymProfileData } from "@/lib/types";
import { Modal } from "./modal";
import { NoAccess } from "./no-access";
import { MemberAvatar, StateBadge, useGymAccess } from "./gym-common";

/** Cobrar o renovar una membresía. Sirve desde la lista, la ficha y la pantalla de acceso. */
export function PayDialog({ member, onClose, onDone }: { member: { id: string; name: string; planId: string | null; planName?: string | null; paidUntil?: string | null }; onClose: () => void; onDone: () => void }) {
  const { data } = useResource<GymProfileData>("/gym/profile");
  const plans = (data?.plans ?? []).filter((p) => p.active);
  const [planId, setPlanId] = useState(member.planId ?? "");
  const [amount, setAmount] = useState<string | null>(null);
  const [method, setMethod] = useState("efectivo");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!planId && plans.length) setPlanId(plans[0].id); }, [plans, planId]);
  const plan: GymPlanItem | undefined = (data?.plans ?? []).find((p) => p.id === planId);
  const shown = amount ?? (plan ? String(plan.price) : "");
  const start = member.paidUntil && member.paidUntil >= todayCO() ? new Date(Date.UTC(+member.paidUntil.slice(0, 4), +member.paidUntil.slice(5, 7) - 1, +member.paidUntil.slice(8, 10) + 1)).toISOString().slice(0, 10) : todayCO();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!planId) return setErr("Elige el plan.");
    const v = parsePesos(shown);
    if (shown.trim() === "" || Number.isNaN(v)) return setErr("Escribe el valor cobrado.");
    setBusy(true);
    try { await api("/gym/payments", { method: "POST", body: JSON.stringify({ memberId: member.id, planId, amount: v, method, note: note.trim() || null }) }); onDone(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Cobrar membresía a {member.name}</h2>
      <div className="field"><label htmlFor="gp-plan">Plan</label><select id="gp-plan" value={planId} onChange={(e) => { setPlanId(e.target.value); setAmount(null); setErr(null); }}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.price)}</option>)}</select></div>
      {plan ? <p className="field__hint">Cubre desde el {niceDate(start)} por {plan.days} día{plan.days === 1 ? "" : "s"}.</p> : null}
      <div className="field-row">
        <div className="field"><label htmlFor="gp-amt">Valor cobrado</label><input id="gp-amt" type="text" inputMode="numeric" value={shown} autoComplete="off" onChange={(e) => { setAmount(e.target.value); setErr(null); }} /><p className="field__hint">Puedes cambiarlo si das un descuento.</p></div>
        <div className="field"><label htmlFor="gp-method">Forma de pago</label><select id="gp-method" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="gp-note">Nota (opcional)</label><input id="gp-note" type="text" maxLength={200} value={note} autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy || !plans.length}>{busy ? "Guardando…" : "Registrar pago"}</button></div>
      {data && !plans.length ? <p className="form-error">Primero crea un plan en “Planes y precios”.</p> : null}
    </form>
  );
}

export function MemberDialog({ member, onClose, onDone }: { member: GymMember | null; onClose: () => void; onDone: (id: string) => void }) {
  const { data } = useResource<GymProfileData>(member ? null : "/gym/profile");
  const plans = (data?.plans ?? []).filter((p) => p.active);
  const [f, setF] = useState({ name: member?.name ?? "", phone: member?.phone ?? "", email: member?.email ?? "", document: member?.document ?? "", notes: member?.notes ?? "", planId: "", method: "efectivo" });
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current = member ? memberPhoto(member.id, member.img) : null;
  const shown = photo === undefined ? current : photo;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };

  async function pick(file?: File) {
    if (!file) return;
    setPhotoBusy(true); setErr(null);
    try { setPhoto(await photoToDataUrl(file)); } catch (x) { setErr(x instanceof Error ? x.message : "No se pudo leer la foto."); } finally { setPhotoBusy(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre del socio.");
    if (!f.phone.trim()) return setErr("Escribe su celular.");
    const body: Record<string, unknown> = { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || null, document: f.document.trim() || null, notes: f.notes.trim() || null };
    if (photo !== undefined) body.image = photo;
    if (!member && f.planId) { body.planId = f.planId; body.method = f.method; }
    setBusy(true);
    try {
      if (member) { await api(`/gym/members/${member.id}`, { method: "PATCH", body: JSON.stringify(body) }); onDone(member.id); }
      else { const r = await api<GymMemberDetail>("/gym/members", { method: "POST", body: JSON.stringify(body) }); onDone((r.member ?? (r as unknown as GymMember)).id); }
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{member ? `Editar a ${member.name}` : "Nuevo socio"}</h2>
      <div className="field photo-field">
        <label htmlFor="gm-photo">Foto</label>
        <div className="photo-field__row">
          {shown ? <img className="photo-field__img" src={shown} alt="Foto del socio" /> : <span className="photo-field__empty" aria-hidden="true">Sin foto</span>}
          <div className="photo-field__actions">
            <input id="gm-photo" type="file" accept="image/*" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
            {shown ? <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setPhoto(null)}>Quitar foto</button> : null}
            <p className="field__hint">{photoBusy ? "Preparando la foto…" : "Aparece en pantalla cuando escanean su QR, para verificar que es él."}</p>
          </div>
        </div>
      </div>
      <div className="field"><label htmlFor="gm-name">Nombre completo</label><input id="gm-name" type="text" value={f.name} autoComplete="off" onChange={set("name")} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="gm-phone">Celular</label><input id="gm-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={set("phone")} /></div>
        <div className="field"><label htmlFor="gm-email">Correo (opcional)</label><input id="gm-email" type="email" value={f.email} autoComplete="off" onChange={set("email")} /><p className="field__hint">Para los avisos de cobro.</p></div>
      </div>
      <div className="field"><label htmlFor="gm-doc">Documento (opcional)</label><input id="gm-doc" type="text" inputMode="numeric" value={f.document} autoComplete="off" onChange={set("document")} /></div>
      {!member ? (
        <div className="field-row">
          <div className="field"><label htmlFor="gm-plan">Plan inicial (opcional)</label><select id="gm-plan" value={f.planId} onChange={set("planId")}><option value="">Sin plan por ahora</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.price)}</option>)}</select></div>
          {f.planId ? <div className="field"><label htmlFor="gm-method">Forma de pago</label><select id="gm-method" value={f.method} onChange={set("method")}>{METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div> : null}
        </div>
      ) : null}
      <div className="field"><label htmlFor="gm-notes">Notas (lesiones, objetivos…)</label><textarea id="gm-notes" rows={2} maxLength={400} value={f.notes} onChange={set("notes")} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy || photoBusy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

const FILTERS: [string, string][] = [["todos", "Todos"], ["al_dia", "Al día"], ["por_vencer", "Por vencer"], ["vencidos", "Vencidos"], ["sin_plan", "Sin plan"], ["inactivos", "Inactivos"], ["baja", "De baja"]];

export function GymMembersView() {
  const { state, allowed } = useGymAccess(["TENANT_ADMIN", "CASHIER"]);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("todos");
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => { const f = new URLSearchParams(window.location.search).get("filter"); if (f && FILTERS.some(([k]) => k === f)) setFilter(f); }, []);
  const { data, error, reload } = useResource<GymMember[]>(allowed ? `/gym/members?filter=${filter}${term ? `&q=${encodeURIComponent(term)}` : ""}` : null);
  const [dlg, setDlg] = useState<{ k: "new" } | { k: "pay"; m: GymMember } | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Socios</h1><p className="lede">Quién pagó, quién está por vencer y quién dejó de venir.</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "new" })}>Nuevo socio</button>
      </div>
      <div className="chips" role="group" aria-label="Filtrar socios">{FILTERS.map(([k, l]) => <button type="button" key={k} className={filter === k ? "is-on" : ""} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}</div>
      <div className="field"><label htmlFor="mq">Buscar por nombre, celular, documento o código</label><input id="mq" type="search" value={q} autoComplete="off" onChange={(e) => setQ(e.target.value)} /></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Socio</th><th>Plan</th><th>Estado</th><th>Última visita</th><th></th></tr></thead><tbody>
        {(data ?? []).map((m) => (
          <tr key={m.id}>
            <td><span className="pet-cell"><MemberAvatar m={m} /><span><b>{m.name}</b><br /><span className="field__hint">{m.phone}</span></span></span></td>
            <td>{m.planName ?? "—"}</td>
            <td><StateBadge state={m.state} /><br /><span className={`field__hint${m.state === "vencido" ? " text-danger" : ""}`}>{dueText(m.daysLeft, m.paidUntil)}</span></td>
            <td>{m.lastCheckin ? niceDate(new Date(new Date(m.lastCheckin).getTime() - 5 * 3600000).toISOString().slice(0, 10)) : "Nunca"}</td>
            <td className="actions-cell">
              {!m.archived ? <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "pay", m })}>Cobrar</button> : null}
              <Link className="btn btn--secondary btn--sm" href={`/socios/${m.id}`}>Abrir</Link>
            </td>
          </tr>
        ))}
      </tbody></table></div>
      {data && !data.length ? <p className="lede">{term ? "No encontramos socios con esa búsqueda." : filter === "todos" ? "Aún no hay socios. Registra el primero." : "No hay socios en esta lista."}</p> : null}
      <Modal open={dlg?.k === "new"} onClose={() => setDlg(null)} wide>{dlg?.k === "new" ? <MemberDialog member={null} onClose={() => setDlg(null)} onDone={(id) => { window.location.href = `/socios/${id}`; }} /> : null}</Modal>
      <Modal open={dlg?.k === "pay"} onClose={() => setDlg(null)}>{dlg?.k === "pay" ? <PayDialog member={dlg.m} onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} /> : null}</Modal>
    </div>
  );
}
