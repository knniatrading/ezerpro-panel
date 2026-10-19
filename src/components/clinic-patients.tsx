"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { age, niceDate } from "@/lib/clinic";
import type { ClinicPatient } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ALL_ROLES, Dlg, PatientDialog, useClinicAccess } from "./clinic-common";

const FILTERS = [{ v: "activos", l: "Activos" }, { v: "deuda", l: "Con saldo" }, { v: "baja", l: "De baja" }];

export function ClinicPatientsView() {
  const { state, allowed, role } = useClinicAccess(ALL_ROLES);
  const router = useRouter();
  const [filter, setFilter] = useState("activos");
  const [q, setQ] = useState("");
  const { data, error } = useResource<ClinicPatient[]>(allowed ? `/clinic/patients?filter=${filter}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}` : null);
  const [dlg, setDlg] = useState(false);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const filters = role === "EMPLOYEE" ? FILTERS.filter((f) => f.v !== "deuda") : FILTERS;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Pacientes</h1><p className="lede">Historias clínicas, odontogramas y tratamientos.</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg(true)}>Nuevo paciente</button></div>
      <div className="agenda-bar">
        <div className="chips" role="group" aria-label="Filtro">{filters.map((f) => <button key={f.v} className={`chip${filter === f.v ? " is-on" : ""}`} aria-pressed={filter === f.v} onClick={() => setFilter(f.v)}>{f.l}</button>)}</div>
        <input type="search" aria-label="Buscar paciente" placeholder="Buscar por nombre, celular o documento" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Paciente</th><th>Celular</th><th>Próxima cita</th>{role !== "EMPLOYEE" ? <th>Saldo</th> : null}</tr></thead><tbody>
        {(data ?? []).map((p) => (
          <tr key={p.id}>
            <td><Link href={`/historias/${p.id}`}><b>{p.name}</b></Link>{p.birthDate ? <span className="field__hint"> · {age(p.birthDate)}</span> : null}{p.allergies ? <><br /><span className="badge badge--warn">Alergia: {p.allergies}</span></> : null}</td>
            <td>{p.phone}</td>
            <td>{p.nextAppt ? niceDate(p.nextAppt) : <span className="field__hint">—</span>}</td>
            {role !== "EMPLOYEE" ? <td>{p.debt ? <b>{formatMoney(p.debt)}</b> : <span className="field__hint">Al día</span>}</td> : null}
          </tr>
        ))}
      </tbody></table></div>
      {data && !data.length ? <p className="lede">{q.trim() ? "No encontramos pacientes con esa búsqueda." : "Aún no hay pacientes en esta lista."}</p> : null}
      <Dlg open={dlg} onClose={() => setDlg(false)}>{dlg ? <PatientDialog item={null} canClinical={role !== "CASHIER"} onClose={() => setDlg(false)} onDone={(p) => router.push(`/historias/${p.id}`)} /> : null}</Dlg>
    </div>
  );
}
