"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { photoToDataUrl } from "@/lib/image";
import { SPECIES } from "@/lib/vet";
import type { VetOwner, VetPet } from "@/lib/types";
import { Modal } from "./modal";
import { NoAccess } from "./no-access";
import { useVetAccess } from "./vet-common";

export function petPhotoUrl(host: string, code: string, v: number | null) {
  return v ? `/api/public/vet-pet-photo?host=${encodeURIComponent(host)}&c=${code}&v=${v}` : null;
}

export function PetAvatar({ pet, size = 44 }: { pet: { name: string; code: string; img: number | null }; size?: number }) {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const src = petPhotoUrl(host, pet.code, pet.img);
  return src ? <img className="pet-av" src={src} alt="" width={size} height={size} /> : <span className="pet-av pet-av--empty" style={{ width: size, height: size }} aria-hidden="true">{pet.name.charAt(0)}</span>;
}

/** Formulario de mascota: sirve para crear (con dueño nuevo o existente) y para editar. */
export function PetDialog({ pet, onClose, onDone, ownerId }: { pet: VetPet | null; ownerId?: string; onClose: () => void; onDone: (petId: string) => void }) {
  const { data: owners } = useResource<VetOwner[]>(pet || ownerId ? null : "/vet/owners");
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [ownerSel, setOwnerSel] = useState(ownerId ?? "");
  const [oName, setOName] = useState("");
  const [oPhone, setOPhone] = useState("");
  const [oEmail, setOEmail] = useState("");
  const [f, setF] = useState({ name: pet?.name ?? "", species: pet?.species ?? "Perro", breed: pet?.breed ?? "", sex: pet?.sex ?? "", birthDate: pet?.birthDate ?? "", weightKg: pet?.weightKg ? String(pet.weightKg) : "", allergies: pet?.allergies ?? "", notes: pet?.notes ?? "" });
  const [photo, setPhoto] = useState<string | null | undefined>(undefined); // undefined = sin cambios
  const [photoBusy, setPhotoBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (owners && owners.length && !ownerId) setMode("existing"); }, [owners, ownerId]);
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const current = pet ? petPhotoUrl(host, pet.code, pet.img) : null;
  const shown = photo === undefined ? current : photo;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };

  async function pick(file?: File) {
    if (!file) return;
    setPhotoBusy(true); setErr(null);
    try { setPhoto(await photoToDataUrl(file)); } catch (x) { setErr(x instanceof Error ? x.message : "No se pudo leer la foto."); }
    finally { setPhotoBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setErr("Escribe el nombre de la mascota.");
    const w = f.weightKg.trim() ? Number(f.weightKg.replace(",", ".")) : null;
    if (w !== null && (!Number.isFinite(w) || w <= 0 || w > 200)) return setErr("El peso debe ser un número en kilos, por ejemplo 12,5.");
    if (f.birthDate && f.birthDate > new Date().toISOString().slice(0, 10)) return setErr("La fecha de nacimiento no puede ser futura.");
    const body: Record<string, unknown> = { name: f.name.trim(), species: f.species, breed: f.breed.trim() || null, sex: f.sex || null, birthDate: f.birthDate || null, weightKg: w, allergies: f.allergies.trim() || null, notes: f.notes.trim() || null };
    if (photo !== undefined) body.image = photo;
    setBusy(true);
    try {
      if (pet) {
        await api(`/vet/pets/${pet.id}`, { method: "PATCH", body: JSON.stringify(body) });
        onDone(pet.id);
        return;
      }
      let oid = ownerSel;
      if (!ownerId && mode === "new") {
        if (oName.trim().length < 2) { setBusy(false); return setErr("Escribe el nombre del dueño."); }
        if (!oPhone.trim()) { setBusy(false); return setErr("Escribe el celular del dueño."); }
        const o = await api<VetOwner>("/vet/owners", { method: "POST", body: JSON.stringify({ name: oName.trim(), phone: oPhone.trim(), email: oEmail.trim() || null }) });
        oid = o.id;
      }
      if (!oid) { setBusy(false); return setErr("Elige el dueño de la mascota."); }
      const created = await api<VetPet>("/vet/pets", { method: "POST", body: JSON.stringify({ ...body, ownerId: oid }) });
      onDone(created.id);
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{pet ? `Editar a ${pet.name}` : "Nueva mascota"}</h2>
      {!pet && !ownerId ? (
        <fieldset className="field"><legend>Dueño</legend>
          {owners && owners.length ? (
            <div className="chips">
              <button type="button" className={mode === "existing" ? "is-on" : ""} aria-pressed={mode === "existing"} onClick={() => setMode("existing")}>Ya es cliente</button>
              <button type="button" className={mode === "new" ? "is-on" : ""} aria-pressed={mode === "new"} onClick={() => setMode("new")}>Cliente nuevo</button>
            </div>
          ) : null}
          {mode === "existing" && owners?.length ? (
            <select aria-label="Dueño" value={ownerSel} onChange={(e) => { setOwnerSel(e.target.value); setErr(null); }}>
              <option value="">Elige un dueño…</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.phone}</option>)}
            </select>
          ) : (
            <>
              <div className="field"><label htmlFor="pd-on">Nombre del dueño</label><input id="pd-on" type="text" value={oName} autoComplete="off" onChange={(e) => { setOName(e.target.value); setErr(null); }} /></div>
              <div className="field-row">
                <div className="field"><label htmlFor="pd-op">Celular</label><input id="pd-op" type="tel" inputMode="numeric" value={oPhone} autoComplete="off" onChange={(e) => { setOPhone(e.target.value); setErr(null); }} /></div>
                <div className="field"><label htmlFor="pd-oe">Correo (opcional)</label><input id="pd-oe" type="email" value={oEmail} autoComplete="off" onChange={(e) => setOEmail(e.target.value)} /><p className="field__hint">Para enviarle recordatorios.</p></div>
              </div>
            </>
          )}
        </fieldset>
      ) : null}
      <div className="field photo-field">
        <label htmlFor="pd-photo">Foto</label>
        <div className="photo-field__row">
          {shown ? <img className="photo-field__img" src={shown} alt="Foto de la mascota" /> : <span className="photo-field__empty" aria-hidden="true">Sin foto</span>}
          <div className="photo-field__actions">
            <input id="pd-photo" type="file" accept="image/*" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
            {shown ? <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setPhoto(null)}>Quitar foto</button> : null}
            <p className="field__hint">{photoBusy ? "Preparando la foto…" : "Ayuda a identificarla si se pierde."}</p>
          </div>
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="pd-name">Nombre</label><input id="pd-name" type="text" value={f.name} autoComplete="off" onChange={set("name")} /></div>
        <div className="field"><label htmlFor="pd-sp">Especie</label><select id="pd-sp" value={f.species} onChange={set("species")}>{SPECIES.map((s) => <option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="pd-breed">Raza</label><input id="pd-breed" type="text" value={f.breed} autoComplete="off" onChange={set("breed")} /></div>
        <div className="field"><label htmlFor="pd-sex">Sexo</label><select id="pd-sex" value={f.sex} onChange={set("sex")}><option value="">Sin indicar</option><option>Macho</option><option>Hembra</option></select></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="pd-birth">Nacimiento</label><input id="pd-birth" type="date" value={f.birthDate} onChange={set("birthDate")} /></div>
        <div className="field"><label htmlFor="pd-w">Peso (kg)</label><input id="pd-w" type="text" inputMode="decimal" value={f.weightKg} autoComplete="off" onChange={set("weightKg")} /></div>
      </div>
      <div className="field"><label htmlFor="pd-al">Alergias</label><input id="pd-al" type="text" value={f.allergies} placeholder="Ej.: pollo, penicilina" autoComplete="off" onChange={set("allergies")} /></div>
      <div className="field"><label htmlFor="pd-notes">Notas</label><textarea id="pd-notes" rows={2} maxLength={400} value={f.notes} onChange={set("notes")} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy || photoBusy}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export function VetPatientsView() {
  const { state, allowed } = useVetAccess();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const { data, error } = useResource<VetPet[]>(allowed ? `/vet/pets${term ? `?q=${encodeURIComponent(term)}` : ""}` : null);
  const [open, setOpen] = useState(false);
  if (state.status === "in" && !allowed) return <NoAccess />;

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Pacientes</h1><p className="lede">Todas las mascotas de tu clínica con su historial y carnet de vacunas.</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setOpen(true)}>Nueva mascota</button>
      </div>
      <div className="field"><label htmlFor="pq">Buscar por mascota, dueño o celular</label><input id="pq" type="search" value={q} autoComplete="off" onChange={(e) => setQ(e.target.value)} /></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Mascota</th><th>Especie y raza</th><th>Dueño</th><th>Celular</th><th></th></tr></thead><tbody>
        {(data ?? []).map((p) => (
          <tr key={p.id}>
            <td><span className="pet-cell"><PetAvatar pet={p} /><b>{p.name}</b>{p.lost ? <span className="badge badge--warn">Perdida</span> : null}</span></td>
            <td>{p.species}{p.breed ? ` · ${p.breed}` : ""}</td>
            <td>{p.owner?.name}</td>
            <td>{p.owner?.phone}</td>
            <td className="actions-cell"><Link className="btn btn--secondary btn--sm" href={`/paciente/${p.id}`}>Abrir ficha</Link></td>
          </tr>
        ))}
      </tbody></table></div>
      {data && !data.length ? <p className="lede">{term ? "No encontramos mascotas con esa búsqueda." : "Aún no hay mascotas. Registra la primera."}</p> : null}
      <Modal open={open} onClose={() => setOpen(false)}>{open ? <PetDialog pet={null} onClose={() => setOpen(false)} onDone={(id) => { window.location.href = `/paciente/${id}`; }} /> : null}</Modal>
    </div>
  );
}
