"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { FILTERS, MECH_FILTERS, QUOTE_TEXT, dateCO } from "@/lib/taller";
import type { TallerOrderRow } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ALL, Dlg, NewOrderDialog, Plate, StatusBadge, useMechanics, useTallerAccess } from "./taller-common";

function Inner() {
  const { state, allowed, role } = useTallerAccess(ALL);
  const sp = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState(sp.get("view") ?? "abiertas");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [mech, setMech] = useState("");
  const [nw, setNw] = useState(false);
  useEffect(() => { const h = setTimeout(() => setDq(q.trim()), 250); return () => clearTimeout(h); }, [q]);
  const mechanics = useMechanics(allowed && role !== "EMPLOYEE");
  const path = allowed ? `/taller/orders?view=${view}${dq ? `&q=${encodeURIComponent(dq)}` : ""}${mech ? `&mechanicId=${mech}` : ""}` : null;
  const { data, error, loading, reload } = useResource<TallerOrderRow[]>(path);
  useEffect(() => { if (!allowed) return; const t = setInterval(() => { if (!document.hidden) reload(); }, 30000); return () => clearInterval(t); }, [allowed, reload]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const showMoney = role !== "EMPLOYEE";
  return (
    <div className="page">
      <div className="page-head"><div><h1>{role === "EMPLOYEE" ? "Mis órdenes" : "Órdenes de servicio"}</h1><p className="lede">{role === "EMPLOYEE" ? "Tus órdenes y las que aún no tienen mecánico." : "Todo lo que está pasando en el taller."}</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setNw(true)}>Nueva orden</button></div>
      <div className="chips" role="group" aria-label="Filtrar por etapa">{(role === "EMPLOYEE" ? MECH_FILTERS : FILTERS).map((f) => <button key={f.v} className={`chip${view === f.v ? " is-on" : ""}`} aria-pressed={view === f.v} onClick={() => setView(f.v)}>{f.l}</button>)}</div>
      <div className="agenda-bar">
        <label>Buscar <input type="search" value={q} placeholder="Placa, nombre, celular o N.º" onChange={(e) => setQ(e.target.value)} /></label>
        {role !== "EMPLOYEE" && mechanics.length ? <label>Mecánico <select value={mech} onChange={(e) => setMech(e.target.value)}><option value="">Todos</option>{mechanics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label> : null}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>N.º</th><th>Vehículo</th><th>Cliente</th><th>Motivo</th><th>Estado</th><th>Mecánico</th>{showMoney ? <th>Total</th> : null}<th>Ingreso</th></tr></thead><tbody>
        {(data ?? []).map((o) => (
          <tr key={o.id}>
            <td><Link href={`/ordenes/${o.id}`}><b>#{o.number}</b></Link></td>
            <td><Plate plate={o.plate} kind={o.kind} /><br /><span className="field__hint">{o.label}</span></td>
            <td>{o.customerName}</td>
            <td>{o.complaint.length > 60 ? o.complaint.slice(0, 60) + "…" : o.complaint}</td>
            <td><StatusBadge status={o.status} />{o.quoteStatus !== "ninguna" && o.quoteStatus !== "aprobada" ? <><br /><span className="field__hint">Cotización: {QUOTE_TEXT[o.quoteStatus]}</span></> : o.quoteStatus === "aprobada" && !["entregado", "cancelado"].includes(o.status) ? <><br /><span className="field__hint">✅ Cliente aprobó</span></> : null}</td>
            <td>{o.mechanicName ?? <span className="field__hint">Sin asignar</span>}</td>
            {showMoney ? <td>{o.total ? formatMoney(o.total) : "—"}{o.paid !== null && o.total > o.paid && o.paid > 0 ? <><br /><span className="field__hint">Abonó {formatMoney(o.paid)}</span></> : null}</td> : null}
            <td>{dateCO(o.createdAt)}</td>
          </tr>
        ))}
      </tbody></table></div>
      {data && !data.length && !loading ? <p className="lede">No hay órdenes en esta vista.</p> : null}
      <Dlg open={nw} onClose={() => setNw(false)}>{nw ? <NewOrderDialog mechanics={mechanics} canAssign={role !== "EMPLOYEE"} onClose={() => setNw(false)} onDone={(id) => router.push(`/ordenes/${id}`)} /> : null}</Dlg>
    </div>
  );
}
export function TallerOrdersView() { return <Suspense fallback={null}><Inner /></Suspense>; }
