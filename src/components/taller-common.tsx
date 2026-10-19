"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "./session";
import { STATUS_TEXT, VEHICLE_KINDS, kindIcon, normPlate } from "@/lib/taller";
import type { TallerMechanic, TallerStatus, TallerVehicleRow } from "@/lib/types";
import { Modal } from "./modal";
export { errMsg, Dlg } from "./clinic-common";
import { errMsg } from "./clinic-common";

export const ADMIN = ["TENANT_ADMIN"];
export const FRONT = ["TENANT_ADMIN", "CASHIER"];
export const ALL = ["TENANT_ADMIN", "CASHIER", "EMPLOYEE"];

export function useTallerAccess(roles: string[] = ADMIN) {
  const { state } = useSession();
  const allowed = state.status === "in" && roles.includes(state.user.role) && !!state.user.tenant?.modules?.includes("taller");
  return { state, allowed, role: state.status === "in" ? state.user.role : "" };
}

export function StatusBadge({ status }: { status: TallerStatus }) {
  const s = STATUS_TEXT[status] ?? { label: status, tone: "info" as const };
  return <span className={`badge badge--${s.tone === "muted" ? "info" : s.tone === "danger" ? "warn" : s.tone}`}>{s.label}</span>;
}

export function Plate({ plate, kind }: { plate: string; kind?: string }) {
  return <span className="tl-plate" aria-label={`Placa ${plate}`}>{kind ? <i aria-hidden="true">{kindIcon(kind)}</i> : null}{plate}</span>;
}

/** Nueva orden: busca por placa; si no existe, registra el vehículo y su dueño en el mismo paso. */
export function NewOrderDialog({ mechanics, canAssign, presetVehicle, onClose, onDone }: {
  mechanics: TallerMechanic[]; canAssign: boolean; presetVehicle?: { id: string; label: string; plate: string; km: number } | null; onClose: () => void; onDone: (orderId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<TallerVehicleRow[]>([]);
  const [veh, setVeh] = useState<{ id: string; label: string; plate: string; km: number } | null>(presetVehicle ?? null);
  const [creating, setCreating] = useState(false);
  const [nv, setNv] = useState({ plate: "", kind: "carro", brand: "", model: "", year: "", name: "", phone: "", email: "" });
  const [complaint, setComplaint] = useState("");
  const [km, setKm] = useState(presetVehicle ? String(presetVehicle.km || "") : "");
  const [mech, setMech] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (veh || creating || q.trim().length < 2) { setList([]); return; }
    const h = setTimeout(() => { api<TallerVehicleRow[]>(`/taller/vehicles?q=${encodeURIComponent(q.trim())}`).then((r) => setList(r.slice(0, 6))).catch(() => setList([])); }, 250);
    return () => clearTimeout(h);
  }, [q, veh, creating]);
  const pick = (v: TallerVehicleRow) => { setVeh({ id: v.id, label: v.label, plate: v.plate, km: v.km }); setKm(v.km ? String(v.km) : ""); setErr(null); };
  const setN = (k: keyof typeof nv) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setNv({ ...nv, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      let vehicleId = veh?.id;
      if (!vehicleId) {
        if (normPlate(nv.plate).length < 4) throw new Error("Escribe la placa del vehículo.");
        if (nv.name.trim().length < 2) throw new Error("Escribe el nombre del dueño.");
        if (nv.phone.replace(/\D/g, "").length < 7) throw new Error("Escribe el celular del dueño.");
        const v = await api<{ id: string }>("/taller/vehicles", { method: "POST", body: JSON.stringify({ plate: nv.plate, kind: nv.kind, brand: nv.brand.trim() || null, model: nv.model.trim() || null, year: nv.year ? Number(nv.year) : null, km: km ? Number(km) : 0, customer: { name: nv.name.trim(), phone: nv.phone.trim(), email: nv.email.trim() || null } }) });
        vehicleId = v.id;
      }
      if (complaint.trim().length < 3) throw new Error("Cuéntanos qué le pasa al vehículo.");
      const o = await api<{ id: string }>("/taller/orders", { method: "POST", body: JSON.stringify({ vehicleId, complaint: complaint.trim(), kmIn: km ? Number(km) : null, mechanicId: mech || undefined }) });
      onDone(o.id);
    } catch (x) {
      if (x && typeof x === "object" && "message" in x && (x as { status?: number }).status === 409) {
        // la placa ya existe: se busca para elegirla
        const plate = normPlate(nv.plate);
        try { const r = await api<TallerVehicleRow[]>(`/taller/vehicles?q=${plate}`); const f = r.find((v) => v.plate === plate); if (f) { pick(f); setCreating(false); setErr("Esa placa ya estaba registrada: la elegimos por ti."); setBusy(false); return; } } catch { /* sigue */ }
      }
      setErr(x instanceof Error ? (x.message || errMsg(x)) : errMsg(x)); setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Nueva orden de servicio</h2>
      {veh ? (
        <div className="field"><span className="label">Vehículo</span><div className="pick-chip"><b><Plate plate={veh.plate} /> {veh.label}</b>{presetVehicle ? null : <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setVeh(null); setQ(""); }}>Cambiar</button>}</div></div>
      ) : !creating ? (
        <div className="field">
          <label htmlFor="no-q">Busca por placa, nombre o celular</label>
          <input id="no-q" type="text" value={q} placeholder="Ej.: ABC123" autoComplete="off" onChange={(e) => setQ(e.target.value)} />
          {list.length ? <ul className="pick-list">{list.map((v) => <li key={v.id}><button type="button" onClick={() => pick(v)}><Plate plate={v.plate} /> {v.label}<span className="field__hint"> · {v.customerName}</span></button></li>)}</ul> : q.trim().length >= 2 ? <p className="field__hint">No encontramos ese vehículo.</p> : null}
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setCreating(true); setNv({ ...nv, plate: normPlate(q) }); }}>Vehículo nuevo</button>
        </div>
      ) : (
        <fieldset className="field pick-new"><legend>Vehículo y dueño nuevos</legend>
          <div className="field-row">
            <div className="field"><label htmlFor="nv-plate">Placa</label><input id="nv-plate" type="text" maxLength={10} value={nv.plate} autoComplete="off" onChange={setN("plate")} /></div>
            <div className="field"><label htmlFor="nv-kind">Tipo</label><select id="nv-kind" value={nv.kind} onChange={setN("kind")}>{VEHICLE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="nv-brand">Marca</label><input id="nv-brand" type="text" value={nv.brand} autoComplete="off" onChange={setN("brand")} /></div>
            <div className="field"><label htmlFor="nv-model">Modelo</label><input id="nv-model" type="text" value={nv.model} autoComplete="off" onChange={setN("model")} /></div>
            <div className="field"><label htmlFor="nv-year">Año</label><input id="nv-year" type="number" inputMode="numeric" value={nv.year} onChange={setN("year")} /></div>
          </div>
          <div className="field"><label htmlFor="nv-name">Nombre del dueño</label><input id="nv-name" type="text" value={nv.name} autoComplete="off" onChange={setN("name")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="nv-phone">Celular</label><input id="nv-phone" type="tel" inputMode="numeric" value={nv.phone} autoComplete="off" onChange={setN("phone")} /></div>
            <div className="field"><label htmlFor="nv-mail">Correo (para recordatorios)</label><input id="nv-mail" type="email" value={nv.email} autoComplete="off" onChange={setN("email")} /></div>
          </div>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setCreating(false)}>Buscar uno existente</button>
        </fieldset>
      )}
      <div className="field"><label htmlFor="no-c">¿Qué le pasa o qué necesita?</label><textarea id="no-c" rows={2} maxLength={500} value={complaint} placeholder="Ej.: ruido al frenar, cambio de aceite" onChange={(e) => { setComplaint(e.target.value); setErr(null); }} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="no-km">Kilometraje actual</label><NumInput id="no-km" value={km} onChange={setKm} /></div>
        {canAssign ? <div className="field"><label htmlFor="no-m">Mecánico</label><select id="no-m" value={mech} onChange={(e) => setMech(e.target.value)}><option value="">Sin asignar</option>{mechanics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div> : null}
      </div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Creando…" : "Crear orden"}</button></div>
    </form>
  );
}

/** Campo de dinero o kilómetros: acepta "300.000" o "300000" y lo muestra con puntos. Guarda solo los dígitos. */
export function NumInput({ id, value, onChange, label, ...rest }: { id: string; value: string; onChange: (digits: string) => void; label?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id">) {
  const shown = value ? Number(value).toLocaleString("es-CO") : "";
  return <input id={id} type="text" inputMode="numeric" autoComplete="off" aria-label={label} value={shown} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))} {...rest} />;
}

export function useMechanics(enabled: boolean) {
  const [m, setM] = useState<TallerMechanic[]>([]);
  useEffect(() => { if (enabled) api<TallerMechanic[]>("/taller/mechanics").then(setM).catch(() => setM([])); }, [enabled]);
  return m;
}
export { Modal };
