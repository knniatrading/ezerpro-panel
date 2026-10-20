"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { tenantOrigin } from "@/lib/tenant-url";
import { ROLE_IN_UNIT, ROLE_IN_UNIT_TEXT, UNIT_KINDS, UNIT_KIND_TEXT, pct, waLink } from "@/lib/residential";
import type { ResPersonDetail, ResPersonRow, ResProfile, ResUnit, ResUnitList } from "@/lib/residential";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { ADMIN_BOARD, ADMIN, CopyBtn, Dlg, Empty, Err, Pill, Tabs, errMsg, useResAccess } from "./res-common";

function UnitForm({ item, onClose, onDone }: { item: ResUnit | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ label: item?.label ?? "", tower: item?.tower ?? "", kind: item?.kind ?? "apartamento", coefficient: item ? String(item.coefficient) : "", monthlyFee: item ? String(item.monthlyFee) : "", area: item?.area != null ? String(item.area) : "", active: item?.active ?? true });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.label.trim().length < 1) return setErr("Escribe el nombre de la unidad (ej. Torre 1 - 101).");
    const coef = Number(f.coefficient.replace(",", "."));
    if (!(coef >= 0 && coef <= 100)) return setErr("El coeficiente es un porcentaje entre 0 y 100.");
    setBusy(true);
    const body = { label: f.label.trim(), tower: f.tower.trim() || null, kind: f.kind, coefficient: coef, monthlyFee: Number(f.monthlyFee.replace(/\D/g, "")) || 0, area: f.area ? Number(f.area.replace(",", ".")) : null, ...(item ? { active: f.active } : {}) };
    try { await api(item ? `/residential/units/${item.id}` : "/residential/units", { method: item ? "PATCH" : "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar unidad" : "Unidad nueva"}</h2>
      <div className="field-row">
        <div className="field"><label htmlFor="un-l">Nombre de la unidad</label><input id="un-l" type="text" value={f.label} placeholder="Torre 1 - 101" autoComplete="off" onChange={set("label")} /></div>
        <div className="field"><label htmlFor="un-t">Torre o bloque</label><input id="un-t" type="text" value={f.tower} placeholder="Torre 1" autoComplete="off" onChange={set("tower")} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="un-k">Tipo</label><select id="un-k" value={f.kind} onChange={set("kind")}>{UNIT_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
        <div className="field"><label htmlFor="un-c">Coeficiente de copropiedad (%)</label><input id="un-c" type="text" inputMode="decimal" value={f.coefficient} placeholder="2,9928" autoComplete="off" onChange={set("coefficient")} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="un-f">Cuota de administración mensual</label><input id="un-f" type="text" inputMode="numeric" value={f.monthlyFee} placeholder="348000" autoComplete="off" onChange={set("monthlyFee")} /></div>
        <div className="field"><label htmlFor="un-a">Área (m²)</label><input id="un-a" type="text" inputMode="decimal" value={f.area} autoComplete="off" onChange={set("area")} /></div>
      </div>
      {item ? <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Unidad activa (cuenta para el quórum y los cobros)</label> : null}
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function ImportForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [txt, setTxt] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const rows = txt.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const p = l.split(/[;\t,]/).map((x) => x.trim());
      return { label: p[0], tower: p[1] || null, kind: p[2] || "apartamento", coefficient: Number((p[3] ?? "0").replace(",", ".")) || 0, monthlyFee: Number((p[4] ?? "0").replace(/\D/g, "")) || 0 };
    });
    if (!rows.length) return setErr("Pega al menos una línea.");
    setBusy(true);
    try { const r = await api<{ created: number; skipped?: number }>("/residential/units/import", { method: "POST", body: JSON.stringify({ rows }) }); setRes(`Se crearon ${r.created} unidades${r.skipped ? ` (${r.skipped} ya existían o no eran válidas)` : ""}.`); setBusy(false); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Importar unidades</h2>
      <p className="lede">Pega una unidad por línea, separando con punto y coma o con la tecla Tab: <b>nombre; torre; tipo; coeficiente; cuota</b>. Puedes copiarlas directo desde Excel.</p>
      <div className="field"><label htmlFor="im-t">Unidades</label><textarea id="im-t" rows={8} value={txt} placeholder={"Torre 1 - 101; Torre 1; apartamento; 2,9928; 348000\nTorre 1 - 102; Torre 1; apartamento; 3,7152; 432000"} onChange={(e) => { setTxt(e.target.value); setErr(null); }} /></div>
      <Err msg={err} />{res ? <p className="note" role="status">{res}</p> : null}
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Importando…" : "Importar"}</button></div>
    </form>
  );
}

type UnitRef = { unitId: string; role: string; sharePct: number };
function PersonForm({ id, units, onClose, onDone }: { id: string | null; units: ResUnit[]; onClose: () => void; onDone: () => void }) {
  const det = useResource<ResPersonDetail>(id ? `/residential/persons/${id}` : null);
  const [f, setF] = useState({ name: "", document: "", phone: "", email: "", validated: false, active: true });
  const [own, setOwn] = useState<UnitRef[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState("");
  useEffect(() => { const p = det.data; if (p) { setF({ name: p.name, document: p.document ?? "", phone: p.phone ?? "", email: p.email ?? "", validated: p.validated, active: p.active }); setOwn(p.units.map((u) => ({ unitId: u.unitId, role: u.role, sharePct: u.sharePct }))); } }, [det.data]);
  const label = (uid: string) => units.find((u) => u.id === uid)?.label ?? "—";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre completo.");
    setBusy(true);
    const body = { name: f.name.trim(), document: f.document.trim() || null, phone: f.phone.trim() || null, email: f.email.trim() || null, active: f.active, validated: f.validated, units: own };
    try { await api(id ? `/residential/persons/${id}` : "/residential/persons", { method: id ? "PATCH" : "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  const p = det.data;
  const origin = "";
  void origin;
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{id ? "Editar persona" : "Propietario o residente nuevo"}</h2>
      <div className="field-row">
        <div className="field"><label htmlFor="pe-n">Nombre completo</label><input id="pe-n" type="text" value={f.name} autoComplete="off" onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="pe-d">Documento</label><input id="pe-d" type="text" inputMode="numeric" value={f.document} autoComplete="off" onChange={(e) => { setF({ ...f, document: e.target.value }); setErr(null); }} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="pe-p">Celular (WhatsApp)</label><input id="pe-p" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={(e) => { setF({ ...f, phone: e.target.value }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="pe-e">Correo</label><input id="pe-e" type="email" value={f.email} autoComplete="off" onChange={(e) => { setF({ ...f, email: e.target.value }); setErr(null); }} /></div>
      </div>
      <fieldset className="field"><legend>Unidades de esta persona</legend>
        {!own.length ? <p className="field__hint">Aún no tiene unidades. Una persona puede tener varios apartamentos o parqueaderos, y una unidad puede tener varios propietarios.</p> : null}
        {own.map((o, i) => (
          <div className="field-row" key={o.unitId}>
            <div className="field"><span className="label">{label(o.unitId)}</span></div>
            <div className="field"><select aria-label={`Rol en ${label(o.unitId)}`} value={o.role} onChange={(e) => setOwn(own.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>{ROLE_IN_UNIT.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
            <div className="field"><input aria-label={`Porcentaje de propiedad en ${label(o.unitId)}`} type="text" inputMode="numeric" value={String(o.sharePct)} onChange={(e) => setOwn(own.map((x, j) => (j === i ? { ...x, sharePct: Number(e.target.value.replace(/\D/g, "").slice(0, 3)) || 0 } : x)))} /><span className="field__hint">% propiedad</span></div>
            <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setOwn(own.filter((_, j) => j !== i))}>Quitar</button>
          </div>
        ))}
        <div className="field-row">
          <select aria-label="Agregar unidad" value={add} onChange={(e) => setAdd(e.target.value)}><option value="">Elige una unidad…</option>{units.filter((u) => !own.some((o) => o.unitId === u.id)).map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select>
          <button type="button" className="btn btn--secondary btn--sm" disabled={!add} onClick={() => { setOwn([...own, { unitId: add, role: "propietario", sharePct: 100 }]); setAdd(""); }}>Agregar unidad</button>
        </div>
      </fieldset>
      {id ? <><label className="check"><input type="checkbox" checked={f.validated} onChange={(e) => setF({ ...f, validated: e.target.checked })} /> Identidad validada (documento verificado por la administración)</label>
        <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Persona activa</label></> : null}
      {p ? <PortalLink person={p} /> : null}
      {p?.participation?.length ? <section><h3>Historial de asambleas</h3><ul className="dcard__list">{p.participation.map((x, i) => <li key={i}><div><b>{x.assembly}</b><p>{x.startsAt.slice(0, 10)} · {x.unit}{x.proxy ? " · con poder" : ""}</p></div></li>)}</ul></section> : null}
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function PortalLink({ person }: { person: ResPersonDetail }) {
  const [url, setUrl] = useState(person.portalUrl);
  const [busy, setBusy] = useState(false);
  async function renew() { setBusy(true); try { const r = await api<{ portalUrl: string }>(`/residential/persons/${person.id}/renew-link`, { method: "POST" }); setUrl(r.portalUrl); } finally { setBusy(false); } }
  return (
    <section className="note"><h3>Enlace personal del residente</h3>
      <p className="field__hint" style={{ wordBreak: "break-all" }}>{url}</p>
      <div className="actions-cell">
        <CopyBtn text={url} />
        {person.phone ? <a className="btn btn--secondary btn--sm" href={waLink(person.phone, `Hola ${person.name.split(" ")[0]}, este es tu enlace personal para el portal del conjunto (visitas, paquetes, reservas, estado de cuenta): ${url}`)} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a> : null}
        <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={renew}>Generar enlace nuevo</button>
      </div>
      <p className="field__hint">Con este enlace la persona entra sin contraseña. Si lo pierde o lo comparte por error, genera uno nuevo y el anterior deja de servir.</p>
    </section>
  );
}

export function ResUnitsView() {
  const { state, allowed, role } = useResAccess(ADMIN_BOARD);
  const admin = role === "TENANT_ADMIN";
  const [tab, setTab] = useState<"units" | "persons">("units");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => { const h = setTimeout(() => setTerm(q.trim()), 250); return () => clearTimeout(h); }, [q]);
  const units = useResource<ResUnitList>(allowed ? "/residential/units" : null);
  const persons = useResource<ResPersonRow[]>(allowed ? `/residential/persons${term ? `?q=${encodeURIComponent(term)}` : ""}` : null);
  const [dlg, setDlg] = useState<null | "unit" | "import" | "person" | { unit: ResUnit } | { person: string } | { del: ResUnit }>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const ul = units.data?.units ?? [];
  const totals = units.data?.totals;
  const close = () => setDlg(null);
  const done = () => { close(); units.reload(); persons.reload(); };
  const shown = ul.filter((u) => !term || `${u.label} ${u.owners.map((o) => o.name).join(" ")}`.toLowerCase().includes(term.toLowerCase()));
  async function delUnit(u: ResUnit) { try { await api(`/residential/units/${u.id}`, { method: "DELETE" }); done(); } catch (x) { setErr(errMsg(x)); close(); } }
  const coefOk = totals ? Math.abs(totals.coefficient - 100) < 0.01 : true;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Unidades y propietarios</h1><p className="lede">Cada unidad con su propietario y su coeficiente de copropiedad.</p></div>
        {admin ? <div className="actions-cell"><button className="btn btn--primary btn--sm" onClick={() => setDlg("person")}>Persona nueva</button><button className="btn btn--secondary btn--sm" onClick={() => setDlg("unit")}>Unidad nueva</button><button className="btn btn--secondary btn--sm" onClick={() => setDlg("import")}>Importar</button></div> : null}</div>
      {totals ? <div className="kpis"><div className="kpi"><span>Unidades</span><strong>{totals.units}</strong></div><div className={`kpi${coefOk ? "" : " kpi--warn"}`}><span>Suma de coeficientes</span><strong>{pct(totals.coefficient, 4)}</strong><small>{coefOk ? "Completa" : "Debería sumar 100 %"}</small></div></div> : null}
      <Tabs tabs={[["units", `Unidades (${ul.length})`], ["persons", `Personas (${persons.data?.length ?? 0})`]]} value={tab} onChange={setTab} />
      <div className="agenda-bar"><label>Buscar <input type="search" value={q} placeholder="Unidad o nombre" onChange={(e) => setQ(e.target.value)} /></label></div>
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {units.error ? <p className="form-error" role="alert">{units.error}</p> : null}
      {tab === "units" ? (
        <div className="table-wrap"><table className="table"><thead><tr><th>Unidad</th><th>Tipo</th><th className="num-r">Coef.</th><th className="num-r">Cuota</th><th>Propietarios</th><th className="num-r">Saldo</th><th></th></tr></thead><tbody>
          {shown.map((u) => (
            <tr key={u.id}><td><b>{u.label}</b>{!u.active ? <> <Pill tone="info">Inactiva</Pill></> : null}</td><td>{UNIT_KIND_TEXT[u.kind] ?? u.kind}</td><td className="num-r">{pct(u.coefficient, 4)}</td><td className="num-r">{u.monthlyFee ? formatMoney(u.monthlyFee) : "—"}</td>
              <td>{u.owners.length ? u.owners.map((o) => <div key={o.personId}>{o.name}{u.owners.length > 1 ? <span className="field__hint"> · {o.sharePct}%</span> : null}{o.role !== "propietario" ? <span className="field__hint"> ({ROLE_IN_UNIT_TEXT[o.role] ?? o.role})</span> : null}</div>) : <span className="field__hint">Sin propietario</span>}</td>
              <td className="num-r">{u.overdue > 0 ? <Pill tone="warn">{formatMoney(u.overdue)}</Pill> : u.balance > 0 ? formatMoney(u.balance) : "Al día"}</td>
              <td className="actions-cell">{admin ? <><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ unit: u })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ del: u })}>Eliminar</button></> : null}</td></tr>
          ))}
        </tbody></table></div>
      ) : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Persona</th><th>Documento</th><th>Celular</th><th>Unidades</th><th></th></tr></thead><tbody>
          {(persons.data ?? []).map((p) => (
            <tr key={p.id}><td><b>{p.name}</b>{p.validated ? <> <Pill tone="ok">Identidad validada</Pill></> : null}{!p.active ? <> <Pill tone="info">Inactiva</Pill></> : null}<br /><span className="field__hint">{p.email ?? ""}</span></td><td>{p.document ?? "—"}</td><td>{p.phone ?? "—"}</td>
              <td>{p.units.map((u) => <div key={u.unitId}>{u.label}<span className="field__hint"> · {ROLE_IN_UNIT_TEXT[u.role] ?? u.role}{u.sharePct < 100 ? ` ${u.sharePct}%` : ""}</span></div>)}</td>
              <td className="actions-cell">{admin ? <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ person: p.id })}>Editar / enlace</button> : <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ person: p.id })}>Ver</button>}</td></tr>
          ))}
        </tbody></table></div>
      )}
      {tab === "units" && units.data && !shown.length ? <Empty>No hay unidades{term ? " con esa búsqueda" : " todavía. Créalas una por una o impórtalas en bloque"}.</Empty> : null}
      <Dlg open={dlg === "unit" || (typeof dlg === "object" && dlg !== null && "unit" in dlg)} onClose={close}>{dlg === "unit" ? <UnitForm item={null} onClose={close} onDone={done} /> : typeof dlg === "object" && dlg && "unit" in dlg ? <UnitForm item={dlg.unit} onClose={close} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg === "import"} onClose={close}>{dlg === "import" ? <ImportForm onClose={close} onDone={() => { units.reload(); }} /> : null}</Dlg>
      <Dlg open={dlg === "person" || (typeof dlg === "object" && dlg !== null && "person" in dlg)} onClose={close} wide>{dlg === "person" ? <PersonForm id={null} units={ul} onClose={close} onDone={done} /> : typeof dlg === "object" && dlg && "person" in dlg ? <PersonForm id={dlg.person} units={ul} onClose={close} onDone={done} /> : null}</Dlg>
      <ConfirmDialog open={typeof dlg === "object" && dlg !== null && "del" in dlg} title="Eliminar unidad" message={typeof dlg === "object" && dlg && "del" in dlg ? `¿Eliminar ${dlg.del.label}? Si ya tiene cobros o asistencias, desactívala en lugar de eliminarla.` : ""} confirmLabel="Sí, eliminar" onConfirm={() => (typeof dlg === "object" && dlg && "del" in dlg ? delUnit(dlg.del) : undefined)} onClose={close} />
    </div>
  );
}
export type { ResProfile };
void tenantOrigin;
void ADMIN;
