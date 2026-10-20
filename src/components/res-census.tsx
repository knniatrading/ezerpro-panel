"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { PET_SPECIES, PET_TEXT, VEH_KINDS } from "@/lib/residential";
import type { ResCensus, ResPet, ResVehicle } from "@/lib/residential";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { ALL, Dlg, Empty, Err, Pill, Tabs, UnitSelect, errMsg, useResAccess, useUnitOptions } from "./res-common";

function VehForm({ item, units, onClose, onDone }: { item: ResVehicle | null; units: ReturnType<typeof useUnitOptions>; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ unitId: item?.unitId ?? "", plate: item?.plate ?? "", kind: item?.kind ?? "carro", brand: item?.brand ?? "", color: item?.color ?? "", authorized: item?.authorized ?? true });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.unitId) return setErr("Elige la unidad.");
    if (f.plate.replace(/[^A-Za-z0-9]/g, "").length < 3) return setErr("Escribe la placa.");
    setBusy(true);
    const body = { plate: f.plate.trim(), kind: f.kind, brand: f.brand.trim() || null, color: f.color.trim() || null, authorized: f.authorized };
    try { await api(item ? `/residential/units/${item.unitId}/vehicles/${item.id}` : `/residential/units/${f.unitId}/vehicles`, { method: item ? "PATCH" : "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar vehículo" : "Vehículo nuevo"}</h2>
      {item ? <p className="lede">{item.unit}</p> : <UnitSelect id="vh-u" value={f.unitId} onChange={(v) => setF({ ...f, unitId: v })} opts={units} />}
      <div className="field-row">
        <div className="field"><label htmlFor="vh-p">Placa</label><input id="vh-p" type="text" value={f.plate} autoComplete="off" onChange={(e) => { setF({ ...f, plate: e.target.value.toUpperCase() }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="vh-k">Tipo</label><select id="vh-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{VEH_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="vh-b">Marca</label><input id="vh-b" type="text" value={f.brand} autoComplete="off" onChange={(e) => setF({ ...f, brand: e.target.value })} /></div>
        <div className="field"><label htmlFor="vh-c">Color</label><input id="vh-c" type="text" value={f.color} autoComplete="off" onChange={(e) => setF({ ...f, color: e.target.value })} /></div>
      </div>
      <label className="check"><input type="checkbox" checked={f.authorized} onChange={(e) => setF({ ...f, authorized: e.target.checked })} /> Autorizado para ingresar</label>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function PetForm({ item, units, onClose, onDone }: { item: ResPet | null; units: ReturnType<typeof useUnitOptions>; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ unitId: item?.unitId ?? "", name: item?.name ?? "", species: item?.species ?? "perro", breed: item?.breed ?? "", color: item?.color ?? "", notes: item?.notes ?? "", vaccinated: item?.vaccinated ?? false });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.unitId) return setErr("Elige la unidad.");
    if (f.name.trim().length < 1) return setErr("Escribe el nombre de la mascota.");
    setBusy(true);
    const body = { name: f.name.trim(), species: f.species, breed: f.breed.trim() || null, color: f.color.trim() || null, notes: f.notes.trim() || null, vaccinated: f.vaccinated };
    try { await api(item ? `/residential/units/${item.unitId}/pets/${item.id}` : `/residential/units/${f.unitId}/pets`, { method: item ? "PATCH" : "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar mascota" : "Mascota nueva"}</h2>
      {item ? <p className="lede">{item.unit}</p> : <UnitSelect id="pt-u" value={f.unitId} onChange={(v) => setF({ ...f, unitId: v })} opts={units} />}
      <div className="field-row">
        <div className="field"><label htmlFor="pt-n">Nombre</label><input id="pt-n" type="text" value={f.name} autoComplete="off" onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="pt-s">Especie</label><select id="pt-s" value={f.species} onChange={(e) => setF({ ...f, species: e.target.value })}>{PET_SPECIES.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="pt-b">Raza</label><input id="pt-b" type="text" value={f.breed} autoComplete="off" onChange={(e) => setF({ ...f, breed: e.target.value })} /></div>
        <div className="field"><label htmlFor="pt-c">Color</label><input id="pt-c" type="text" value={f.color} autoComplete="off" onChange={(e) => setF({ ...f, color: e.target.value })} /></div>
      </div>
      <div className="field"><label htmlFor="pt-no">Señas para reconocerla</label><input id="pt-no" type="text" value={f.notes} placeholder="Collar azul, mancha en la oreja…" autoComplete="off" onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      <label className="check"><input type="checkbox" checked={f.vaccinated} onChange={(e) => setF({ ...f, vaccinated: e.target.checked })} /> Vacunas al día</label>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

export function ResCensusView() {
  const { state, allowed, role } = useResAccess(ALL);
  const canEdit = role === "TENANT_ADMIN" || role === "CASHIER";
  const [tab, setTab] = useState<"veh" | "pets">("veh");
  const [q, setQ] = useState("");
  const data = useResource<ResCensus>(allowed ? "/residential/census" : null);
  const units = useUnitOptions(allowed && canEdit);
  const [dlg, setDlg] = useState<null | "veh" | "pet" | { veh: ResVehicle } | { pet: ResPet } | { delV: ResVehicle } | { delP: ResPet }>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const close = () => setDlg(null);
  const done = () => { close(); data.reload(); };
  const t = q.trim().toLowerCase();
  const vehicles = (data.data?.vehicles ?? []).filter((v) => !t || `${v.plate} ${v.unit} ${v.brand ?? ""}`.toLowerCase().includes(t));
  const pets = (data.data?.pets ?? []).filter((p) => !t || `${p.name} ${p.unit} ${p.breed ?? ""}`.toLowerCase().includes(t));
  async function del(kind: "vehicles" | "pets", unitId: string, id: string) { try { await api(`/residential/units/${unitId}/${kind}/${id}`, { method: "DELETE" }); done(); } catch (x) { setErr(errMsg(x)); close(); } }
  return (
    <div className="page">
      <div className="page-head"><div><h1>Vehículos y mascotas</h1><p className="lede">Las placas autorizadas y el censo de mascotas del conjunto. Los residentes también los registran desde su portal.</p></div>
        {canEdit ? <button className="btn btn--primary btn--sm" onClick={() => setDlg(tab === "veh" ? "veh" : "pet")}>{tab === "veh" ? "Vehículo nuevo" : "Mascota nueva"}</button> : null}</div>
      <Tabs tabs={[["veh", `Vehículos (${data.data?.vehicles.length ?? 0})`], ["pets", `Mascotas (${data.data?.pets.length ?? 0})`]]} value={tab} onChange={setTab} />
      <div className="agenda-bar"><label>Buscar <input type="search" value={q} placeholder={tab === "veh" ? "Placa o unidad" : "Nombre o unidad"} onChange={(e) => setQ(e.target.value)} /></label></div>
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {tab === "veh" ? (
        <div className="table-wrap"><table className="table"><thead><tr><th>Placa</th><th>Unidad</th><th>Vehículo</th><th></th></tr></thead><tbody>
          {vehicles.map((v) => <tr key={v.id}><td><span className="dcard__plate dcard__plate--sm">{v.plate}</span></td><td>{v.unit}</td><td>{[v.kind, v.brand, v.color].filter(Boolean).join(" · ")}{!v.authorized ? <> <Pill tone="warn">No autorizado</Pill></> : null}</td>
            <td className="actions-cell">{canEdit ? <><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ veh: v })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ delV: v })}>Quitar</button></> : null}</td></tr>)}
        </tbody></table></div>
      ) : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Mascota</th><th>Unidad</th><th>Detalle</th><th></th></tr></thead><tbody>
          {pets.map((p) => <tr key={p.id}><td><b>{p.name}</b></td><td>{p.unit}</td><td>{[PET_TEXT[p.species] ?? p.species, p.breed, p.color, p.notes].filter(Boolean).join(" · ")}{p.vaccinated ? <> <Pill tone="ok">Vacunas al día</Pill></> : null}</td>
            <td className="actions-cell">{canEdit ? <><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ pet: p })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ delP: p })}>Quitar</button></> : null}</td></tr>)}
        </tbody></table></div>
      )}
      {data.data && ((tab === "veh" && !vehicles.length) || (tab === "pets" && !pets.length)) ? <Empty>No hay registros{t ? " con esa búsqueda" : " todavía"}.</Empty> : null}
      <Dlg open={dlg === "veh" || (typeof dlg === "object" && dlg !== null && "veh" in dlg)} onClose={close}>{dlg === "veh" ? <VehForm item={null} units={units} onClose={close} onDone={done} /> : typeof dlg === "object" && dlg && "veh" in dlg ? <VehForm item={dlg.veh} units={units} onClose={close} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg === "pet" || (typeof dlg === "object" && dlg !== null && "pet" in dlg)} onClose={close}>{dlg === "pet" ? <PetForm item={null} units={units} onClose={close} onDone={done} /> : typeof dlg === "object" && dlg && "pet" in dlg ? <PetForm item={dlg.pet} units={units} onClose={close} onDone={done} /> : null}</Dlg>
      <ConfirmDialog open={typeof dlg === "object" && dlg !== null && "delV" in dlg} title="Quitar vehículo" message="¿Quitar este vehículo del censo?" confirmLabel="Sí, quitar" onConfirm={() => (typeof dlg === "object" && dlg && "delV" in dlg ? del("vehicles", dlg.delV.unitId, dlg.delV.id) : undefined)} onClose={close} />
      <ConfirmDialog open={typeof dlg === "object" && dlg !== null && "delP" in dlg} title="Quitar mascota" message="¿Quitar esta mascota del censo?" confirmLabel="Sí, quitar" onConfirm={() => (typeof dlg === "object" && dlg && "delP" in dlg ? del("pets", dlg.delP.unitId, dlg.delP.id) : undefined)} onClose={close} />
    </div>
  );
}
