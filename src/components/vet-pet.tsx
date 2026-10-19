"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, parsePesos } from "@/lib/format";
import { ageText, KIND_LABEL, niceDate, todayCO, waLink } from "@/lib/vet";
import type { VetPetDetail, VetRecord } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { ApptBadge, useVetAccess } from "./vet-common";
import { PetAvatar, PetDialog } from "./vet-patients";
import { timeCO, dateCO } from "@/lib/vet";

function RecordDialog({ petId, rec, onClose, onDone }: { petId: string; rec: VetRecord | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ kind: rec?.kind ?? "consulta", title: rec?.title ?? "", notes: rec?.notes ?? "", date: rec?.date ?? todayCO(), weightKg: rec?.weightKg ? String(rec.weightKg) : "", amount: rec?.amount ? String(rec.amount) : "", nextDue: rec?.nextDue ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.title.trim().length < 2) return setErr("Escribe de qué se trata (por ejemplo, “Vacuna antirrábica”).");
    const w = f.weightKg.trim() ? Number(f.weightKg.replace(",", ".")) : null;
    if (w !== null && (!Number.isFinite(w) || w <= 0 || w > 200)) return setErr("El peso debe ser un número en kilos.");
    if (f.nextDue && f.nextDue < f.date) return setErr("La próxima fecha debe ser igual o posterior a la del registro.");
    const body = JSON.stringify({ kind: f.kind, title: f.title.trim(), notes: f.notes.trim() || null, date: f.date, weightKg: w, amount: parsePesos(f.amount), nextDue: f.nextDue || null });
    setBusy(true);
    try {
      if (rec) await api(`/vet/records/${rec.id}`, { method: "PATCH", body });
      else await api(`/vet/pets/${petId}/records`, { method: "POST", body });
      onDone();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{rec ? "Editar registro" : "Nuevo registro"}</h2>
      <div className="field-row">
        <div className="field"><label htmlFor="rd-kind">Tipo</label><select id="rd-kind" value={f.kind} onChange={set("kind")}>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor="rd-date">Fecha</label><input id="rd-date" type="date" value={f.date} onChange={set("date")} /></div>
      </div>
      <div className="field"><label htmlFor="rd-title">Detalle</label><input id="rd-title" type="text" value={f.title} placeholder="Vacuna antirrábica, control de piel…" autoComplete="off" onChange={set("title")} /></div>
      <div className="field"><label htmlFor="rd-notes">Notas del veterinario</label><textarea id="rd-notes" rows={3} maxLength={400} value={f.notes} onChange={set("notes")} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="rd-w">Peso (kg)</label><input id="rd-w" type="text" inputMode="decimal" value={f.weightKg} autoComplete="off" onChange={set("weightKg")} /></div>
        <div className="field"><label htmlFor="rd-amt">Valor cobrado</label><input id="rd-amt" type="text" inputMode="numeric" value={f.amount} autoComplete="off" onChange={set("amount")} /><p className="field__hint">{parsePesos(f.amount) ? formatMoney(parsePesos(f.amount)) : "Suma a los ingresos de hoy."}</p></div>
      </div>
      <div className="field"><label htmlFor="rd-next">Próxima dosis o control (opcional)</label><input id="rd-next" type="date" value={f.nextDue} onChange={set("nextDue")} /><p className="field__hint">Le enviamos un recordatorio por correo al dueño antes de esa fecha.</p></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export function VetPetView({ id }: { id: string }) {
  const { state, allowed } = useVetAccess();
  const { data, error, reload } = useResource<VetPetDetail>(allowed ? `/vet/pets/${id}` : null);
  const [dlg, setDlg] = useState<{ k: "edit" } | { k: "rec"; rec: VetRecord | null } | { k: "delrec"; id: string } | { k: "delpet" } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "vacuna">("all");
  useEffect(() => { if (data?.idUrl) QRCode.toDataURL(data.idUrl, { width: 600, margin: 1 }).then(setQr).catch(() => setQr(null)); }, [data?.idUrl]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  if (error) return <div className="page"><p className="form-error" role="alert">{error}</p><Link href="/pacientes">Volver a pacientes</Link></div>;
  if (!data) return <div className="page"><p className="lede" role="status">Cargando…</p></div>;
  const { pet, owner, records, appointments } = data;
  const vaccines = records.filter((r) => r.kind === "vacuna" || r.kind === "desparasitacion");
  const shown = tab === "vacuna" ? vaccines : records;
  const done = () => { setDlg(null); reload(); };
  const age = ageText(pet.birthDate);

  async function sendAccess() {
    setMsg(null); setErr(null);
    try { await api(`/vet/owners/${owner.id}/send-access`, { method: "POST" }); setMsg(`Enviamos el acceso a ${owner.email}.`); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setMsg(`${what} copiado.`); setErr(null); } catch { setErr("No se pudo copiar."); }
  }
  async function toggleLost() {
    try { await api(`/vet/pets/${pet.id}`, { method: "PATCH", body: JSON.stringify({ lost: !pet.lost }) }); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  async function delRec() {
    if (dlg?.k !== "delrec") return;
    try { await api(`/vet/records/${dlg.id}`, { method: "DELETE" }); done(); } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); }
  }
  async function delPet() {
    try { await api(`/vet/pets/${pet.id}`, { method: "DELETE" }); window.location.href = "/pacientes"; } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); }
  }

  return (
    <div className="page">
      <div className="no-print">
        <p><Link href="/pacientes">← Pacientes</Link></p>
        <div className="page-head">
          <div className="pet-head"><PetAvatar pet={pet} size={72} /><div><h1>{pet.name} {pet.lost ? <span className="badge badge--warn">Perdida</span> : null}</h1>
            <p className="lede">{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}{pet.sex ? ` · ${pet.sex}` : ""}{age ? ` · ${age}` : ""}{pet.weightKg ? ` · ${pet.weightKg} kg` : ""}</p></div></div>
          <div className="actions-cell">
            <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "rec", rec: null })}>Nuevo registro</button>
            <Link className="btn btn--secondary btn--sm" href={`/citas?pet=${pet.id}`}>Agendar cita</Link>
            <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "edit" })}>Editar</button>
          </div>
        </div>
        {msg ? <p className="note" role="status">{msg}</p> : null}
        {err ? <p className="form-error" role="alert">{err}</p> : null}

        <div className="vet-grid">
          <section className="dcard__sec" aria-label="Datos de la mascota">
            <h2>Ficha</h2>
            <dl className="pet-facts">
              <dt>Código</dt><dd><b>{pet.code}</b></dd>
              <dt>Alergias</dt><dd>{pet.allergies ? <span className="text-danger">{pet.allergies}</span> : "Ninguna registrada"}</dd>
              <dt>Nacimiento</dt><dd>{pet.birthDate ? niceDate(pet.birthDate) : "—"}</dd>
              <dt>Notas</dt><dd>{pet.notes ?? "—"}</dd>
            </dl>
            <h2>Dueño</h2>
            <p><b>{owner.name}</b><br />{owner.phone}{owner.email ? <><br />{owner.email}</> : null}</p>
            <div className="actions-cell">
              <a className="btn btn--secondary btn--sm" href={waLink(owner.phone, `Hola ${owner.name}, te escribimos de la clínica sobre ${pet.name}.`)} target="_blank" rel="noreferrer">WhatsApp</a>
              <button className="btn btn--secondary btn--sm" onClick={() => copy(owner.portalUrl, "Enlace del portal")}>Copiar enlace del portal</button>
              <a className="btn btn--secondary btn--sm" href={waLink(owner.phone, `Hola ${owner.name}, este es tu acceso personal para ver el carnet de ${pet.name} y pedir citas: ${owner.portalUrl}`)} target="_blank" rel="noreferrer">Enviar portal por WhatsApp</a>
              {owner.email ? <button className="btn btn--secondary btn--sm" onClick={sendAccess}>Enviar portal por correo</button> : null}
            </div>
          </section>

          <section className="dcard__sec" aria-label="Pet ID y QR">
            <h2>Pet ID</h2>
            {qr ? <img src={qr} alt={`QR de la ficha pública de ${pet.name}`} width={180} height={180} /> : null}
            <p className="field__hint">Imprímelo para la placa o el carnet. Quien lo escanee ve los datos básicos de {pet.name}; si está marcada como perdida, también el celular del dueño.</p>
            <div className="actions-cell">
              <button className="btn btn--primary btn--sm" onClick={() => window.print()} disabled={!qr}>Imprimir QR</button>
              <button className="btn btn--secondary btn--sm" onClick={() => copy(data.idUrl, "Enlace")}>Copiar enlace</button>
              <button className={`btn btn--sm ${pet.lost ? "btn--primary" : "btn--secondary"}`} onClick={toggleLost}>{pet.lost ? "Ya apareció" : "Marcar como perdida"}</button>
            </div>
          </section>
        </div>

        <section className="dcard__sec" aria-label="Historial">
          <div className="page-head"><h2>Historial médico</h2>
            <div className="chips"><button type="button" className={tab === "all" ? "is-on" : ""} aria-pressed={tab === "all"} onClick={() => setTab("all")}>Todo</button><button type="button" className={tab === "vacuna" ? "is-on" : ""} aria-pressed={tab === "vacuna"} onClick={() => setTab("vacuna")}>Carnet de vacunas</button></div></div>
          {!shown.length ? <p className="field__hint">Aún no hay registros.</p> : null}
          <ul className="timeline">
            {shown.map((r) => (
              <li key={r.id}>
                <div><b>{r.title}</b> <span className="badge badge--info">{KIND_LABEL[r.kind] ?? r.kind}</span>
                  <p>{niceDate(r.date)}{r.weightKg ? ` · ${r.weightKg} kg` : ""}{r.amount ? ` · ${formatMoney(r.amount)}` : ""}</p>
                  {r.notes ? <p>{r.notes}</p> : null}
                  {r.nextDue ? <p className={r.nextDue < todayCO() ? "text-danger" : ""}>Próxima: {niceDate(r.nextDue)}</p> : null}</div>
                <div className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "rec", rec: r })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delrec", id: r.id })}>Quitar</button></div>
              </li>
            ))}
          </ul>
        </section>

        {appointments.length ? (
          <section className="dcard__sec" aria-label="Citas">
            <h2>Citas</h2>
            <ul className="dcard__list">{appointments.map((a) => <li key={a.id}><div><b>{a.serviceName}</b><p>{niceDate(dateCO(a.start))} · {timeCO(a.start)}</p></div><ApptBadge status={a.status} /></li>)}</ul>
          </section>
        ) : null}
        <p><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "delpet" })}>Eliminar mascota</button></p>
      </div>

      {qr ? (
        <div className="qr-sheet" aria-hidden="true">
          <div className="qr-card"><p className="qr-card__table">{pet.name}</p><img src={qr} alt="" /><p className="qr-card__hint">Si me encuentras, escanea este código</p><p className="qr-card__hint">{pet.code}</p></div>
        </div>
      ) : null}

      <Modal open={dlg?.k === "edit"} onClose={() => setDlg(null)} wide>{dlg?.k === "edit" ? <PetDialog pet={pet} onClose={() => setDlg(null)} onDone={done} /> : null}</Modal>
      <Modal open={dlg?.k === "rec"} onClose={() => setDlg(null)}>{dlg?.k === "rec" ? <RecordDialog petId={pet.id} rec={dlg.rec} onClose={() => setDlg(null)} onDone={done} /> : null}</Modal>
      <ConfirmDialog open={dlg?.k === "delrec"} title="Quitar registro" message="¿Quitar este registro del historial?" confirmLabel="Sí, quitar" onConfirm={delRec} onClose={() => setDlg(null)} />
      <ConfirmDialog open={dlg?.k === "delpet"} title="Eliminar mascota" message={`¿Eliminar a ${pet.name} y todo su historial? No se puede deshacer.`} confirmLabel="Sí, eliminar" onConfirm={delPet} onClose={() => setDlg(null)} />
    </div>
  );
}
