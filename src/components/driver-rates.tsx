"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, parsePesos } from "@/lib/format";
import type { DriverData, RideExtraItem, RideServiceItem } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { useSession } from "./session";
import { NoAccess } from "./no-access";

type Dlg =
  | { kind: "service"; item: RideServiceItem | null }
  | { kind: "extra"; item: RideExtraItem | null }
  | { kind: "del"; what: "services" | "extras"; id: string; name: string }
  | null;

function ItemDialog({ kind, item, onClose, onDone }: { kind: "service" | "extra"; item: RideServiceItem | RideExtraItem | null; onClose: () => void; onDone: () => void }) {
  const isSvc = kind === "service";
  const [name, setName] = useState(item?.name ?? "");
  const [desc, setDesc] = useState((item as RideServiceItem | null)?.description ?? "");
  const cur = item ? (isSvc ? (item as RideServiceItem).price : (item as RideExtraItem).amount) : null;
  const [val, setVal] = useState(cur ? String(cur) : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const v = parsePesos(val);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Escribe el nombre.");
    if (!isSvc && !v) return setErr("Escribe el valor del extra.");
    setBusy(true);
    const body = JSON.stringify(isSvc ? { name: name.trim(), description: desc.trim() || null, price: v || null } : { name: name.trim(), amount: v });
    const base = isSvc ? "/driver/services" : "/driver/extras";
    try {
      if (item) await api(`${base}/${item.id}`, { method: "PATCH", body });
      else await api(base, { method: "POST", body });
      onDone();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar" : "Nuevo"} {isSvc ? "servicio" : "extra"}</h2>
      <div className="field"><label htmlFor="s-name">Nombre</label><input id="s-name" type="text" value={name} autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(null); }} /></div>
      {isSvc ? <div className="field"><label htmlFor="s-desc">Descripción (opcional)</label><input id="s-desc" type="text" value={desc} autoComplete="off" onChange={(e) => setDesc(e.target.value)} /></div> : null}
      <div className="field">
        <label htmlFor="s-val">{isSvc ? "Precio fijo (opcional)" : "Valor (pesos)"}</label>
        <input id="s-val" type="text" inputMode="numeric" value={val} autoComplete="off" onChange={(e) => { setVal(e.target.value); setErr(null); }} />
        <p className="field__hint">{v ? formatMoney(v) : isSvc ? "Déjalo vacío si lo cotizas según el recorrido." : "Sin puntos ni comas"}</p>
      </div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export function RatesView() {
  const { state } = useSession();
  const allowed = state.status === "in" && state.user.role === "TENANT_ADMIN" && !!state.user.tenant?.modules?.includes("tarjeta");
  const { data, error, reload } = useResource<DriverData>(allowed ? "/driver/profile" : null);
  const [perKm, setPerKm] = useState("");
  const [baseFee, setBaseFee] = useState("");
  const [minFare, setMinFare] = useState("");
  const [dlg, setDlg] = useState<Dlg>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = data?.profile;
    if (!p) return;
    setPerKm(String(p.perKm)); setBaseFee(String(p.baseFee)); setMinFare(String(p.minFare));
  }, [data]);

  if (state.status === "in" && !allowed) return <NoAccess />;
  const pk = parsePesos(perKm), bf = parsePesos(baseFee), mf = parsePesos(minFare);
  const example = Math.max(mf, bf + Math.round(5 * pk));

  async function saveRates(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(false);
    try {
      await api("/driver/profile", { method: "PATCH", body: JSON.stringify({ perKm: pk, baseFee: bf, minFare: mf }) });
      setOk(true);
      reload();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
    } finally { setBusy(false); }
  }
  async function toggle(base: string, id: string, active: boolean) {
    try { await api(`${base}/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  async function del() {
    if (dlg?.kind !== "del") return;
    try { await api(`/driver/${dlg.what}/${dlg.id}`, { method: "DELETE" }); setDlg(null); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); }
  }
  const done = () => { setDlg(null); reload(); };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Tarifas y servicios</h1>
          <p className="lede">Define cuánto cobras. Al cotizar, el sistema te sugiere el precio y tú lo ajustas.</p>
        </div>
      </div>
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      <form onSubmit={saveRates} noValidate className="rates-form">
        <h2 className="section-title">Mis tarifas</h2>
        <div className="field-row">
          <div className="field"><label htmlFor="r-base">Valor base (pesos)</label><input id="r-base" type="text" inputMode="numeric" value={baseFee} autoComplete="off" onChange={(e) => { setBaseFee(e.target.value); setOk(false); }} /></div>
          <div className="field"><label htmlFor="r-km">Por kilómetro (pesos)</label><input id="r-km" type="text" inputMode="numeric" value={perKm} autoComplete="off" onChange={(e) => { setPerKm(e.target.value); setOk(false); }} /></div>
          <div className="field"><label htmlFor="r-min">Tarifa mínima (pesos)</label><input id="r-min" type="text" inputMode="numeric" value={minFare} autoComplete="off" onChange={(e) => { setMinFare(e.target.value); setOk(false); }} /></div>
        </div>
        <p className="note">Ejemplo: un recorrido de 5 km costaría {formatMoney(example)} (sin extras).</p>
        {ok ? <p className="note" role="status">Tarifas guardadas.</p> : null}
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar tarifas"}</button>
      </form>

      <div className="page-head"><h2 className="section-title">Servicios que ofreces</h2><button className="btn btn--primary btn--sm" onClick={() => setDlg({ kind: "service", item: null })}>Agregar servicio</button></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Servicio</th><th>Precio</th><th>Visible</th><th></th></tr></thead><tbody>
        {(data?.services ?? []).map((s) => (
          <tr key={s.id}>
            <td><b>{s.name}</b>{s.description ? <><br /><span className="field__hint">{s.description}</span></> : null}</td>
            <td>{s.price ? formatMoney(s.price) : "Se cotiza"}</td>
            <td><button className={`chip ${s.active ? "is-on" : ""}`} aria-pressed={s.active} onClick={() => toggle("/driver/services", s.id, !s.active)}>{s.active ? "Sí" : "No"}</button></td>
            <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "service", item: s })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ kind: "del", what: "services", id: s.id, name: s.name })}>Quitar</button></td>
          </tr>
        ))}
      </tbody></table></div>

      <div className="page-head"><h2 className="section-title">Extras (se suman al precio)</h2><button className="btn btn--primary btn--sm" onClick={() => setDlg({ kind: "extra", item: null })}>Agregar extra</button></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Extra</th><th>Valor</th><th>Visible</th><th></th></tr></thead><tbody>
        {(data?.extras ?? []).map((x) => (
          <tr key={x.id}>
            <td><b>{x.name}</b></td>
            <td>{formatMoney(x.amount)}</td>
            <td><button className={`chip ${x.active ? "is-on" : ""}`} aria-pressed={x.active} onClick={() => toggle("/driver/extras", x.id, !x.active)}>{x.active ? "Sí" : "No"}</button></td>
            <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "extra", item: x })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ kind: "del", what: "extras", id: x.id, name: x.name })}>Quitar</button></td>
          </tr>
        ))}
      </tbody></table></div>

      <Modal open={dlg?.kind === "service" || dlg?.kind === "extra"} onClose={() => setDlg(null)}>
        {dlg && (dlg.kind === "service" || dlg.kind === "extra") ? <ItemDialog kind={dlg.kind} item={dlg.item} onClose={() => setDlg(null)} onDone={done} /> : null}
      </Modal>
      <ConfirmDialog open={dlg?.kind === "del"} title="Quitar" message={dlg?.kind === "del" ? `¿Quitar “${dlg.name}”? Los servicios ya pedidos no cambian.` : ""} confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
