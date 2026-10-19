"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, parsePesos } from "@/lib/format";
import { METHODS, RECORD_KIND, age, niceDate, timeCO, todayCO, waLink } from "@/lib/clinic";
import type { ClinicPatientDetail, ClinicProfileData, ClinicTreatment, ConsentTpl, ToothChart } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { Odontogram } from "./clinic-odontogram";
import { ALL_ROLES, ApptBadge, ApptDialog, Dlg, PatientDialog, errMsg, useClinicAccess } from "./clinic-common";

type Tab = "resumen" | "odonto" | "historia" | "trat" | "recetas" | "consent";

function CopyBtn({ text, label = "Copiar enlace" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="btn btn--secondary btn--sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* sin portapapeles */ } }}>{ok ? "¡Copiado!" : label}</button>;
}

function RecordDialog({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState("evolucion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tooth, setTooth] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return setErr("Escribe un título.");
    setBusy(true);
    try { await api(`/clinic/patients/${id}/records`, { method: "POST", body: JSON.stringify({ kind, title: title.trim(), body: body.trim() || null, tooth: tooth.trim() || null }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Nueva nota clínica</h2>
      <div className="field-row">
        <div className="field"><label htmlFor="rc-k">Tipo</label><select id="rc-k" value={kind} onChange={(e) => setKind(e.target.value)}>{["evolucion", "procedimiento", "otro"].map((k) => <option key={k} value={k}>{RECORD_KIND[k]}</option>)}</select></div>
        <div className="field"><label htmlFor="rc-t">Diente (opcional)</label><input id="rc-t" type="text" maxLength={20} value={tooth} placeholder="Ej.: 36" autoComplete="off" onChange={(e) => setTooth(e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="rc-ti">Título</label><input id="rc-ti" type="text" maxLength={100} value={title} placeholder="Ej.: Resina en 36" autoComplete="off" onChange={(e) => { setTitle(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="rc-b">Detalle</label><textarea id="rc-b" rows={5} maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function TreatmentDialog({ id, doctor, onClose, onDone }: { id: string; doctor: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [inst, setInst] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const v = parsePesos(total);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Escribe el nombre del tratamiento.");
    if (!total.trim() || Number.isNaN(v) || v < 1) return setErr("Escribe el valor total.");
    const n = inst.trim() ? Number(inst) : null;
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > 60)) return setErr("Las cuotas deben estar entre 1 y 60.");
    setBusy(true);
    try { await api("/clinic/treatments", { method: "POST", body: JSON.stringify({ patientId: id, name: name.trim(), total: v, installments: n, notes: notes.trim() || null, doctorName: doctor || null }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Nuevo tratamiento</h2>
      <div className="field"><label htmlFor="tr-n">Tratamiento</label><input id="tr-n" type="text" maxLength={100} value={name} placeholder="Ortodoncia, implante, blanqueamiento…" autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(null); }} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="tr-t">Valor total</label><input id="tr-t" type="text" inputMode="numeric" value={total} autoComplete="off" onChange={(e) => { setTotal(e.target.value); setErr(null); }} /><p className="field__hint">{total.trim() && !Number.isNaN(v) ? formatMoney(v) : ""}</p></div>
        <div className="field"><label htmlFor="tr-i">Cuotas pactadas (opcional)</label><input id="tr-i" type="text" inputMode="numeric" value={inst} autoComplete="off" onChange={(e) => setInst(e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="tr-no">Notas</label><input id="tr-no" type="text" maxLength={500} value={notes} autoComplete="off" onChange={(e) => setNotes(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Crear"}</button></div>
    </form>
  );
}

function PayDialog({ patientId, t, onClose, onDone }: { patientId: string; t: ClinicTreatment | null; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(t ? String(Math.min(t.balance, t.installments ? Math.ceil(t.total / t.installments) : t.balance)) : "");
  const [method, setMethod] = useState("efectivo");
  const [note, setNote] = useState("");
  const [concept, setConcept] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const v = parsePesos(amount);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount.trim() || Number.isNaN(v) || v < 1) return setErr("Escribe el valor del pago.");
    if (!t && concept.trim().length < 2) return setErr("Escribe el concepto del pago.");
    setBusy(true);
    try { await api("/clinic/payments", { method: "POST", body: JSON.stringify({ patientId, treatmentId: t?.id, concept: t ? undefined : concept.trim(), amount: v, method, note: note.trim() || null }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{t ? `Abono · ${t.name}` : "Registrar pago"}</h2>
      {t ? <p className="lede">Saldo pendiente: <b>{formatMoney(t.balance)}</b></p> : <div className="field"><label htmlFor="py-c">Concepto</label><input id="py-c" type="text" maxLength={100} value={concept} placeholder="Consulta, limpieza…" autoComplete="off" onChange={(e) => { setConcept(e.target.value); setErr(null); }} /></div>}
      <div className="field-row">
        <div className="field"><label htmlFor="py-a">Valor</label><input id="py-a" type="text" inputMode="numeric" value={amount} autoComplete="off" onChange={(e) => { setAmount(e.target.value); setErr(null); }} /><p className="field__hint">{amount.trim() && !Number.isNaN(v) ? formatMoney(v) : ""}</p></div>
        <div className="field"><label htmlFor="py-m">Medio de pago</label><select id="py-m" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="py-n">Nota (opcional)</label><input id="py-n" type="text" maxLength={200} value={note} autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Registrar"}</button></div>
    </form>
  );
}

function RxDialog({ id, cfg, onClose, onDone }: { id: string; cfg: ClinicProfileData | null; onClose: () => void; onDone: () => void }) {
  const docs = (cfg?.agendas ?? []).filter((a) => a.active && a.kind === "especialista");
  const [ag, setAg] = useState(docs[0]?.id ?? "");
  const [dx, setDx] = useState("");
  const [items, setItems] = useState([{ drug: "", dose: "", instructions: "" }]);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!ag && docs[0]) setAg(docs[0].id); }, [docs, ag]);
  const upd = (i: number, k: "drug" | "dose" | "instructions", v: string) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = items.filter((x) => x.drug.trim());
    if (!clean.length) return setErr("Agrega al menos un medicamento.");
    setBusy(true);
    try { await api("/clinic/prescriptions", { method: "POST", body: JSON.stringify({ patientId: id, agendaId: ag || undefined, diagnosis: dx.trim() || null, notes: notes.trim() || null, items: clean.map((x) => ({ drug: x.drug.trim(), dose: x.dose.trim() || null, instructions: x.instructions.trim() || null })) }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Nueva receta</h2>
      {docs.length ? <div className="field"><label htmlFor="rx-d">Firma el doctor</label><select id="rx-d" value={ag} onChange={(e) => setAg(e.target.value)}>{docs.map((a) => <option key={a.id} value={a.id}>{a.name}{a.specialty ? ` · ${a.specialty}` : ""}</option>)}</select></div> : null}
      <div className="field"><label htmlFor="rx-dx">Diagnóstico</label><input id="rx-dx" type="text" maxLength={300} value={dx} autoComplete="off" onChange={(e) => setDx(e.target.value)} /></div>
      {items.map((x, i) => (
        <fieldset key={i} className="rx-item"><legend>Medicamento {i + 1}</legend>
          <div className="field"><label htmlFor={`rx-m${i}`}>Nombre y presentación</label><input id={`rx-m${i}`} type="text" maxLength={100} value={x.drug} placeholder="Amoxicilina 500 mg cápsulas" autoComplete="off" onChange={(e) => { upd(i, "drug", e.target.value); setErr(null); }} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor={`rx-o${i}`}>Dosis</label><input id={`rx-o${i}`} type="text" maxLength={100} value={x.dose} placeholder="1 cápsula cada 8 horas" autoComplete="off" onChange={(e) => upd(i, "dose", e.target.value)} /></div>
            <div className="field"><label htmlFor={`rx-i${i}`}>Indicaciones</label><input id={`rx-i${i}`} type="text" maxLength={250} value={x.instructions} placeholder="Por 7 días, con comida" autoComplete="off" onChange={(e) => upd(i, "instructions", e.target.value)} /></div>
          </div>
          {items.length > 1 ? <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setItems(items.filter((_, j) => j !== i))}>Quitar medicamento</button> : null}
        </fieldset>
      ))}
      {items.length < 12 ? <button type="button" className="btn btn--secondary btn--sm" onClick={() => setItems([...items, { drug: "", dose: "", instructions: "" }])}>Agregar otro medicamento</button> : null}
      <div className="field"><label htmlFor="rx-n">Indicaciones generales</label><textarea id="rx-n" rows={2} maxLength={600} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Crear receta"}</button></div>
    </form>
  );
}

function ConsentDialog({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const tpls = useResource<ConsentTpl[]>("/clinic/consent-templates");
  const list = (tpls.data ?? []).filter((t) => t.active);
  const [tid, setTid] = useState("");
  const [custom, setCustom] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sel = tid || list[0]?.id;
    if (!custom && !sel) return setErr("Elige una plantilla o escribe un texto propio.");
    setBusy(true);
    try { await api("/clinic/consents", { method: "POST", body: JSON.stringify(custom ? { patientId: id, title: title.trim(), body: body.trim() } : { patientId: id, templateId: sel }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Nuevo consentimiento</h2>
      {!custom ? (
        <div className="field"><label htmlFor="cs-t">Plantilla</label><select id="cs-t" value={tid || list[0]?.id || ""} onChange={(e) => setTid(e.target.value)}>{list.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
          {tpls.data && !list.length ? <p className="field__hint">No hay plantillas activas.</p> : null}</div>
      ) : (
        <>
          <div className="field"><label htmlFor="cs-ti">Título</label><input id="cs-ti" type="text" maxLength={100} value={title} autoComplete="off" onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="field"><label htmlFor="cs-b">Texto</label><textarea id="cs-b" rows={7} maxLength={6000} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        </>
      )}
      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setCustom(!custom)}>{custom ? "Usar una plantilla" : "Escribir un texto propio"}</button>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Creando…" : "Crear"}</button></div>
    </form>
  );
}

export function ClinicPatientView({ id }: { id: string }) {
  const { state, allowed, role } = useClinicAccess(ALL_ROLES);
  const router = useRouter();
  const { data, error, reload } = useResource<ClinicPatientDetail>(allowed ? `/clinic/patients/${id}` : null);
  const cfg = useResource<ClinicProfileData>(allowed ? "/clinic/profile" : null);
  const clinical = role !== "CASHIER";
  const admin = role === "TENANT_ADMIN";
  const finance = role !== "EMPLOYEE";
  const tabs: { v: Tab; l: string }[] = [{ v: "resumen", l: "Resumen" }, ...(clinical ? [{ v: "odonto" as Tab, l: "Odontograma" }, { v: "historia" as Tab, l: "Historia" }] : []), { v: "trat", l: "Tratamientos y abonos" }, ...(clinical ? [{ v: "recetas" as Tab, l: "Recetas" }] : []), { v: "consent", l: "Consentimientos" }];
  const [tab, setTab] = useState<Tab>("resumen");
  const [draft, setDraft] = useState<ToothChart | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dlg, setDlg] = useState<{ k: string; t?: ClinicTreatment; rid?: string; name?: string } | null>(null);
  useEffect(() => { if (data?.chart) setDraft(data.chart); else if (data) setDraft({}); }, [data]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  if (!data) return <div className="page">{error ? <p className="form-error" role="alert">{error}</p> : <p className="lede">Cargando…</p>}</div>;
  const p = data.patient;
  const dirty = JSON.stringify(draft ?? {}) !== JSON.stringify(data.chart ?? {});
  const done = () => { setDlg(null); reload(); };
  const flash = (m: string) => { setMsg(m); setErr(null); setTimeout(() => setMsg(null), 4000); };

  async function saveChart() {
    setSaving(true);
    try { await api(`/clinic/patients/${id}/chart`, { method: "PUT", body: JSON.stringify({ chart: draft }) }); flash("Odontograma guardado."); reload(); } catch (x) { setErr(errMsg(x)); }
    setSaving(false);
  }
  async function act(fn: () => Promise<unknown>, ok?: string) { try { await fn(); if (ok) flash(ok); setDlg(null); reload(); } catch (x) { setErr(errMsg(x)); setDlg(null); } }
  const first = p.name.split(" ")[0];
  const portalMsg = `Hola ${first}, este es tu enlace personal para ver tus citas, recetas y estado de cuenta: ${p.portalUrl}`;
  const doctorName = state.status === "in" && role === "EMPLOYEE" ? state.user.name ?? "" : "";

  return (
    <div className="page">
      <div className="page-head"><div>
        <p className="field__hint"><Link href="/historias">← Pacientes</Link></p>
        <h1>{p.name}</h1>
        <p className="lede">{[age(p.birthDate), p.document ? `Doc. ${p.document}` : "", p.phone].filter(Boolean).join(" · ")}</p></div>
        <div className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "edit" })}>Editar</button><button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "appt" })}>Agendar cita</button></div></div>
      {p.allergies ? <p className="alert-allergy" role="note"><b>Alergias:</b> {p.allergies}</p> : null}
      {msg ? <p className="form-ok" role="status">{msg}</p> : null}
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      <div className="tabs" role="tablist">{tabs.map((t) => <button key={t.v} role="tab" aria-selected={tab === t.v} className={`tab${tab === t.v ? " is-on" : ""}`} onClick={() => setTab(t.v)}>{t.l}</button>)}</div>

      {tab === "resumen" ? (
        <div className="cl-stack">
          <section className="card"><h2>Datos</h2>
            <dl className="kv"><dt>Celular</dt><dd>{p.phone}</dd><dt>Correo</dt><dd>{p.email ?? "—"}</dd><dt>Nacimiento</dt><dd>{p.birthDate ? `${p.birthDate} (${age(p.birthDate)})` : "—"}</dd>
              {clinical ? <><dt>Antecedentes</dt><dd>{p.conditions || "—"}</dd></> : null}<dt>Notas</dt><dd>{p.notes ?? "—"}</dd></dl>
            {admin ? <button className="btn btn--secondary btn--sm" onClick={() => act(() => api(`/clinic/patients/${id}`, { method: "PATCH", body: JSON.stringify({ archived: !p.archived }) }), p.archived ? "Paciente reactivado." : "Paciente dado de baja.")}>{p.archived ? "Reactivar paciente" : "Dar de baja"}</button> : null}
            {admin ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delpat" })}>Eliminar paciente</button> : null}
          </section>
          <section className="card"><h2>Portal del paciente</h2>
            <p className="field__hint">Con este enlace personal el paciente ve sus citas, recetas y estado de cuenta, y puede pedir citas.</p>
            <div className="actions-cell"><CopyBtn text={p.portalUrl} /><a className="btn btn--secondary btn--sm" href={waLink(p.phone, portalMsg)} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>
              {finance && p.email ? <button className="btn btn--secondary btn--sm" onClick={() => act(() => api(`/clinic/patients/${id}/send-access`, { method: "POST" }), "Enlace enviado al correo.")}>Enviar por correo</button> : null}</div>
          </section>
          <section className="card"><h2>Citas</h2>
            {data.appointments.length ? <ul className="plain-list">{data.appointments.map((a) => <li key={a.id}><b>{niceDate(a.start)} · {timeCO(a.start)}</b> · {a.serviceName} · {a.agendaName} <ApptBadge status={a.status} /></li>)}</ul> : <p className="field__hint">Sin citas registradas.</p>}
          </section>
        </div>
      ) : null}

      {tab === "odonto" && clinical ? (
        <section className="card"><h2>Odontograma</h2>
          <Odontogram chart={draft ?? {}} onChange={setDraft} />
          <div className="actions-cell"><button className="btn btn--primary" disabled={!dirty || saving} onClick={saveChart}>{saving ? "Guardando…" : "Guardar odontograma"}</button>{dirty ? <button className="btn btn--secondary" onClick={() => setDraft(data.chart ?? {})}>Descartar cambios</button> : null}</div>
          <p className="field__hint">Cada cambio guardado queda anotado en la historia clínica.</p>
        </section>
      ) : null}

      {tab === "historia" && clinical ? (
        <section className="card"><div className="card__head"><h2>Historia clínica</h2><button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "record" })}>Nueva nota</button></div>
          {data.records.length ? <ol className="rec-list">{data.records.map((r) => (
            <li key={r.id}><div><b>{r.title}</b> <span className="badge badge--info">{RECORD_KIND[r.kind] ?? r.kind}</span>{r.tooth ? <span className="badge badge--info">Diente {r.tooth}</span> : null}</div>
              <div className="field__hint">{niceDate(r.createdAt)}{r.doctorName ? ` · ${r.doctorName}` : ""}</div>
              {r.body ? <p className="prewrap">{r.body}</p> : null}
              {admin ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delrec", rid: r.id })}>Quitar</button> : null}</li>
          ))}</ol> : <p className="field__hint">Aún no hay notas.</p>}
        </section>
      ) : null}

      {tab === "trat" ? (
        <section className="card"><div className="card__head"><h2>Tratamientos y abonos</h2>
          <div className="actions-cell">{clinical ? <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "treat" })}>Nuevo tratamiento</button> : null}{finance ? <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "pay" })}>Registrar pago suelto</button> : null}</div></div>
          {data.treatments.length ? data.treatments.map((t) => (
            <article key={t.id} className="treat">
              <div className="treat__top"><b>{t.name}</b> <span className={`badge badge--${t.status === "activo" ? "warn" : t.status === "terminado" ? "ok" : "info"}`}>{t.status}</span></div>
              <div className="treat__bar" role="img" aria-label={`Pagado ${formatMoney(t.paid)} de ${formatMoney(t.total)}`}><i style={{ width: `${Math.min(100, Math.round((t.paid / t.total) * 100))}%` }} /></div>
              <p>Total <b>{formatMoney(t.total)}</b> · Pagado <b>{formatMoney(t.paid)}</b> · Saldo <b>{formatMoney(t.balance)}</b>{t.installments ? ` · ${t.paymentsCount} de ${t.installments} cuotas` : ""}</p>
              {t.doctorName ? <p className="field__hint">{t.doctorName} · desde {t.startDate}</p> : null}
              {finance && t.payments.length ? <ul className="plain-list">{t.payments.map((y) => <li key={y.id}>{niceDate(y.paidAt)} · {formatMoney(y.amount)} · {y.method}{y.note ? ` · ${y.note}` : ""}{admin ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delpay", rid: y.id })}>Quitar</button> : null}</li>)}</ul> : null}
              <div className="actions-cell">
                {finance && t.status === "activo" && t.balance > 0 ? <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "pay", t })}>Registrar abono</button> : null}
                {clinical && t.status === "activo" ? <button className="btn btn--secondary btn--sm" onClick={() => act(() => api(`/clinic/treatments/${t.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelado" }) }))}>Cancelar tratamiento</button> : null}
                {admin && !t.paymentsCount ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "deltreat", rid: t.id, name: t.name })}>Eliminar</button> : null}
              </div>
            </article>
          )) : <p className="field__hint">Sin tratamientos.</p>}
        </section>
      ) : null}

      {tab === "recetas" && clinical ? (
        <section className="card"><div className="card__head"><h2>Recetas</h2><button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "rx" })}>Nueva receta</button></div>
          {data.prescriptions.length ? <ul className="plain-list">{data.prescriptions.map((r) => (
            <li key={r.id}><b>Receta N.º {r.number}</b> · {niceDate(r.createdAt)} · {r.doctorName}{r.diagnosis ? ` · ${r.diagnosis}` : ""}
              <div className="actions-cell"><a className="btn btn--secondary btn--sm" href={r.url} target="_blank" rel="noopener noreferrer">Ver / imprimir</a><CopyBtn text={r.url} />
                <a className="btn btn--secondary btn--sm" href={waLink(p.phone, `Hola ${first}, esta es tu receta médica: ${r.url}`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                {admin ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delrx", rid: r.id })}>Quitar</button> : null}</div></li>
          ))}</ul> : <p className="field__hint">Aún no hay recetas.</p>}
        </section>
      ) : null}

      {tab === "consent" ? (
        <section className="card"><div className="card__head"><h2>Consentimientos informados</h2><button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "consent" })}>Nuevo consentimiento</button></div>
          {data.consents.length ? <ul className="plain-list">{data.consents.map((c) => (
            <li key={c.id}><b>{c.title}</b> <span className={`badge badge--${c.status === "firmado" ? "ok" : "warn"}`}>{c.status === "firmado" ? "Firmado" : "Pendiente"}</span>
              <div className="field__hint">{c.status === "firmado" ? `Firmó ${c.signedName} · ${niceDate(c.signedAt ?? c.createdAt)}` : `Creado ${niceDate(c.createdAt)}`}</div>
              <div className="actions-cell"><a className="btn btn--secondary btn--sm" href={c.url} target="_blank" rel="noopener noreferrer">{c.status === "firmado" ? "Ver / imprimir" : "Firmar aquí"}</a>
                {c.status === "pendiente" ? <><CopyBtn text={c.url} /><a className="btn btn--secondary btn--sm" href={waLink(p.phone, `Hola ${first}, por favor revisa y firma este consentimiento: ${c.url}`)} target="_blank" rel="noopener noreferrer">WhatsApp</a></> : null}
                {admin ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delcons", rid: c.id })}>Quitar</button> : null}</div></li>
          ))}</ul> : <p className="field__hint">Sin consentimientos.</p>}
        </section>
      ) : null}

      <Dlg open={dlg?.k === "edit"} onClose={() => setDlg(null)}>{dlg?.k === "edit" ? <PatientDialog item={p} canClinical={clinical} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "appt"} onClose={() => setDlg(null)}>{dlg?.k === "appt" && cfg.data ? <ApptDialog cfg={cfg.data} patient={{ id: p.id, name: p.name }} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "record"} onClose={() => setDlg(null)}>{dlg?.k === "record" ? <RecordDialog id={id} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "treat"} onClose={() => setDlg(null)}>{dlg?.k === "treat" ? <TreatmentDialog id={id} doctor={doctorName} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "pay"} onClose={() => setDlg(null)}>{dlg?.k === "pay" ? <PayDialog patientId={id} t={dlg.t ?? null} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "rx"} onClose={() => setDlg(null)}>{dlg?.k === "rx" ? <RxDialog id={id} cfg={cfg.data} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "consent"} onClose={() => setDlg(null)}>{dlg?.k === "consent" ? <ConsentDialog id={id} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <ConfirmDialog open={dlg?.k === "delpat"} title="Eliminar paciente" message="Se borrarán su historia, citas, recetas y consentimientos. Los pagos quedan en el registro de ingresos. ¿Continuar?" confirmLabel="Sí, eliminar" onConfirm={() => act(async () => { await api(`/clinic/patients/${id}`, { method: "DELETE" }); router.push("/historias"); })} onClose={() => setDlg(null)} />
      <ConfirmDialog open={dlg?.k === "delrec"} title="Quitar nota" message="¿Quitar esta nota de la historia clínica?" confirmLabel="Sí, quitar" onConfirm={() => act(() => api(`/clinic/records/${dlg?.rid}`, { method: "DELETE" }))} onClose={() => setDlg(null)} />
      <ConfirmDialog open={dlg?.k === "delpay"} title="Quitar pago" message="El pago deja de contar en el saldo y en los ingresos. ¿Quitarlo?" confirmLabel="Sí, quitar" onConfirm={() => act(() => api(`/clinic/payments/${dlg?.rid}`, { method: "DELETE" }))} onClose={() => setDlg(null)} />
      <ConfirmDialog open={dlg?.k === "deltreat"} title="Eliminar tratamiento" message={`¿Eliminar “${dlg?.name ?? ""}”?`} confirmLabel="Sí, eliminar" onConfirm={() => act(() => api(`/clinic/treatments/${dlg?.rid}`, { method: "DELETE" }))} onClose={() => setDlg(null)} />
      <ConfirmDialog open={dlg?.k === "delrx"} title="Quitar receta" message="El enlace público de la receta dejará de funcionar. ¿Quitarla?" confirmLabel="Sí, quitar" onConfirm={() => act(() => api(`/clinic/prescriptions/${dlg?.rid}`, { method: "DELETE" }))} onClose={() => setDlg(null)} />
      <ConfirmDialog open={dlg?.k === "delcons"} title="Quitar consentimiento" message="Si ya estaba firmado, se pierde la firma. ¿Quitarlo?" confirmLabel="Sí, quitar" onConfirm={() => act(() => api(`/clinic/consents/${dlg?.rid}`, { method: "DELETE" }))} onClose={() => setDlg(null)} />
    </div>
  );
}
