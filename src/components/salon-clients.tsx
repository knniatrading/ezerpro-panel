"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { KIND_TEXT, RECORD_KINDS, STATUS_TEXT, niceDate, timeCO, waLink } from "@/lib/salon";
import type { SalonClientDetail, SalonClientRow, SalonProfileData } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { ALL, ApptDialog, Dlg, errMsg, useSalonAccess } from "./salon-common";

function ClientForm({ item, onClose, onDone }: { item: SalonClientDetail["client"] | null; onClose: () => void; onDone: (id: string) => void }) {
  const [f, setF] = useState({ name: item?.name ?? "", phone: item?.phone ?? "", email: item?.email ?? "", birthDate: item?.birthDate ?? "", allergies: item?.allergies ?? "", notes: item?.notes ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre.");
    setBusy(true);
    const body = { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || null, birthDate: f.birthDate || null, allergies: f.allergies.trim() || null, notes: f.notes.trim() || null };
    try {
      const r = item ? await api<{ id: string }>(`/salon/clients/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }) : await api<{ id: string }>("/salon/clients", { method: "POST", body: JSON.stringify(body) });
      onDone(r.id);
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar cliente" : "Cliente nuevo"}</h2>
      <div className="field-row">
        <div className="field"><label htmlFor="cl-n">Nombre completo</label><input id="cl-n" type="text" value={f.name} autoComplete="off" onChange={set("name")} /></div>
        <div className="field"><label htmlFor="cl-p">Celular</label><input id="cl-p" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={set("phone")} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="cl-e">Correo (opcional)</label><input id="cl-e" type="email" value={f.email} autoComplete="off" onChange={set("email")} /></div>
        <div className="field"><label htmlFor="cl-b">Cumpleaños (opcional)</label><input id="cl-b" type="date" value={f.birthDate} onChange={set("birthDate")} /></div>
      </div>
      <div className="field"><label htmlFor="cl-a">Alergias o sensibilidades</label><textarea id="cl-a" rows={2} maxLength={400} value={f.allergies} placeholder="Ej: alergia al PPD (tinte oscuro), sensible al amoníaco" onChange={set("allergies")} /><p className="field__hint">Aparece resaltado en la agenda y en la caja para que nadie lo olvide.</p></div>
      <div className="field"><label htmlFor="cl-no">Notas</label><textarea id="cl-no" rows={2} maxLength={800} value={f.notes} onChange={set("notes")} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

export function SalonClientsView() {
  const { state, allowed } = useSalonAccess(ALL);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => { const h = setTimeout(() => setTerm(q.trim()), 250); return () => clearTimeout(h); }, [q]);
  const list = useResource<SalonClientRow[]>(allowed ? `/salon/clients${term ? `?q=${encodeURIComponent(term)}` : ""}` : null);
  const [open, setOpen] = useState(false);
  if (state.status === "in" && !allowed) return <NoAccess />;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Clientes</h1><p className="lede">Cada cliente tiene su ficha con fórmulas, alergias, historial de visitas y compras.</p></div><button className="btn btn--primary btn--sm" onClick={() => setOpen(true)}>Cliente nuevo</button></div>
      <div className="agenda-bar"><label>Buscar <input type="search" value={q} placeholder="Nombre o celular" onChange={(e) => setQ(e.target.value)} /></label></div>
      {list.error ? <p className="form-error" role="alert">{list.error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Cliente</th><th>Celular</th><th>Visitas</th><th>Última visita</th><th></th></tr></thead><tbody>
        {(list.data ?? []).map((c) => (
          <tr key={c.id}><td><b><Link href={`/salon-clientes/${c.id}`}>{c.name}</Link></b>{c.allergies ? <><br /><span className="badge badge--warn">⚠ {c.allergies.length > 40 ? `${c.allergies.slice(0, 40)}…` : c.allergies}</span></> : null}</td><td>{c.phone}</td><td>{c.visits}</td><td>{c.lastVisit ? niceDate(c.lastVisit) : "—"}</td><td className="actions-cell"><Link className="btn btn--secondary btn--sm" href={`/salon-clientes/${c.id}`}>Ver ficha</Link></td></tr>
        ))}
      </tbody></table></div>
      {list.data && !list.data.length ? <p className="lede">{term ? "No encontramos clientes con esa búsqueda." : "Todavía no hay clientes. Se crean solos cuando reservan en línea, o desde «Cliente nuevo»."}</p> : null}
      <Dlg open={open} onClose={() => setOpen(false)}>{open ? <ClientForm item={null} onClose={() => setOpen(false)} onDone={() => { setOpen(false); list.reload(); }} /> : null}</Dlg>
    </div>
  );
}

function RecordForm({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState("formula");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return setErr("Escribe un título.");
    setBusy(true);
    try { await api(`/salon/clients/${id}/records`, { method: "POST", body: JSON.stringify({ kind, title: title.trim(), body: body.trim() || null }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Anotar en la ficha</h2>
      <div className="chips" role="group" aria-label="Tipo">{RECORD_KINDS.map((k) => <button type="button" key={k.v} className={kind === k.v ? "is-on" : ""} aria-pressed={kind === k.v} onClick={() => setKind(k.v)}>{k.l}</button>)}</div>
      <div className="field"><label htmlFor="rc-t">Título</label><input id="rc-t" type="text" maxLength={100} value={title} placeholder={kind === "formula" ? "Ej: Tinte rubio cenizo" : "Ej: Corte degradado"} autoComplete="off" onChange={(e) => { setTitle(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="rc-b">Detalle</label><textarea id="rc-b" rows={5} maxLength={1500} value={body} placeholder={kind === "formula" ? "Ej: mezcla 7.1 + 8.1, oxidante 20 vol, 35 min de tiempo de pose" : ""} onChange={(e) => setBody(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar nota"}</button></div>
    </form>
  );
}

export function SalonClientView({ id }: { id: string }) {
  const { state, allowed, role } = useSalonAccess(ALL);
  const { data, error, reload } = useResource<SalonClientDetail>(allowed ? `/salon/clients/${id}` : null);
  const cfg = useResource<SalonProfileData>(allowed ? "/salon/profile" : null);
  const [dlg, setDlg] = useState<"edit" | "note" | "appt" | "del" | { rec: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  if (error) return <div className="page"><p className="form-error" role="alert">{error}</p><Link href="/salon-clientes">← Volver a clientes</Link></div>;
  if (!data) return <div className="page"><p className="lede">Cargando…</p></div>;
  const c = data.client;
  const admin = role === "TENANT_ADMIN";
  async function delClient() { try { await api(`/salon/clients/${id}`, { method: "DELETE" }); window.location.href = "/salon-clientes"; } catch (x) { setErr(errMsg(x)); setDlg(null); } }
  async function delRec(rid: string) { try { await api(`/salon/records/${rid}`, { method: "DELETE" }); setDlg(null); reload(); } catch (x) { setErr(errMsg(x)); setDlg(null); } }
  return (
    <div className="page">
      <p className="field__hint"><Link href="/salon-clientes">← Clientes</Link></p>
      <div className="page-head"><div><h1>{c.name}</h1><p className="lede">{c.phone}{c.email ? ` · ${c.email}` : ""}{c.birthDate ? ` · 🎂 ${niceDate(c.birthDate)}` : ""}</p></div>
        <div className="actions-cell"><button className="btn btn--primary btn--sm" onClick={() => setDlg("appt")}>Agendar cita</button><a className="btn btn--secondary btn--sm" href={waLink(c.phone, `Hola ${c.name.split(" ")[0]} 👋`)} target="_blank" rel="noopener noreferrer">WhatsApp</a><button className="btn btn--secondary btn--sm" onClick={() => setDlg("edit")}>Editar</button>{admin ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg("del")}>Eliminar</button> : null}</div></div>
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {c.allergies ? <p className="note note--warn" role="alert"><b>⚠ Alergias o sensibilidades:</b> {c.allergies}</p> : null}
      {c.notes ? <p className="note"><b>Notas:</b> {c.notes}</p> : null}
      <div className="kpis"><div className="kpi"><span>Visitas</span><strong>{data.visits.filter((v) => v.status === "atendida").length}</strong></div><div className="kpi"><span>Ha gastado</span><strong>{formatMoney(data.spent)}</strong></div></div>
      <div className="vet-grid">
        <section className="dcard__sec" aria-label="Fórmulas y notas"><h2>Fórmulas y notas</h2>
          <button className="btn btn--primary btn--sm" onClick={() => setDlg("note")}>Anotar fórmula o nota</button>
          {!data.records.length ? <p className="field__hint">Aún no hay notas. Guarda aquí las fórmulas de color para repetir el mismo resultado.</p> : null}
          <ul className="dcard__list">{data.records.map((r) => (
            <li key={r.id}><div><b>{r.title}</b> <span className="badge badge--info">{KIND_TEXT[r.kind] ?? r.kind}</span>{r.body ? <p style={{ whiteSpace: "pre-wrap" }}>{r.body}</p> : null}<p className="field__hint">{niceDate(r.createdAt)}{r.staffName ? ` · ${r.staffName}` : ""}</p></div>
              {admin ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ rec: r.id })}>Borrar</button> : null}</li>
          ))}</ul>
        </section>
        <section className="dcard__sec" aria-label="Visitas"><h2>Citas</h2>
          {!data.visits.length ? <p className="field__hint">Sin citas todavía.</p> : null}
          <ul className="dcard__list">{data.visits.map((v) => <li key={v.id}><div><b>{niceDate(v.start)} · {timeCO(v.start)}</b><p>{v.services.join(" + ")} · con {v.staffName}</p></div><span className={`badge badge--${STATUS_TEXT[v.status]?.tone ?? "info"}`}>{STATUS_TEXT[v.status]?.label ?? v.status}</span></li>)}</ul>
        </section>
        <section className="dcard__sec" aria-label="Compras"><h2>Compras</h2>
          {!data.purchases.length ? <p className="field__hint">Sin compras todavía.</p> : null}
          <ul className="dcard__list">{data.purchases.map((p) => <li key={p.id}><div><b>#{p.number} · {niceDate(p.at)}</b><p>{p.items.join(", ")}</p></div><span>{formatMoney(p.total)}</span></li>)}</ul>
        </section>
      </div>
      <Dlg open={dlg === "edit"} onClose={() => setDlg(null)}>{dlg === "edit" ? <ClientForm item={c} onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} /> : null}</Dlg>
      <Dlg open={dlg === "note"} onClose={() => setDlg(null)}>{dlg === "note" ? <RecordForm id={id} onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} /> : null}</Dlg>
      <Dlg open={dlg === "appt"} onClose={() => setDlg(null)}>{dlg === "appt" && cfg.data ? <ApptDialog cfg={cfg.data} client={{ id: c.id, name: c.name }} onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} /> : null}</Dlg>
      <ConfirmDialog open={dlg === "del"} title="Eliminar cliente" message={`¿Eliminar a ${c.name}? Sus ventas anteriores se conservan.`} confirmLabel="Sí, eliminar" onConfirm={delClient} onClose={() => setDlg(null)} />
      <ConfirmDialog open={typeof dlg === "object" && dlg !== null && "rec" in dlg} title="Borrar nota" message="¿Borrar esta nota de la ficha?" confirmLabel="Sí, borrar" onConfirm={() => typeof dlg === "object" && dlg && "rec" in dlg ? delRec(dlg.rec) : undefined} onClose={() => setDlg(null)} />
    </div>
  );
}
