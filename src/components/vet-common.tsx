"use client";

import { useSession } from "./session";
import { APPT_LABEL } from "@/lib/vet";

export function useVetAccess() {
  const { state } = useSession();
  const allowed = state.status === "in" && state.user.role === "TENANT_ADMIN" && !!state.user.tenant?.modules?.includes("veterinaria");
  return { state, allowed };
}

export function ApptBadge({ status }: { status: string }) {
  const s = APPT_LABEL[status] ?? { label: status, tone: "info" as const };
  return <span className={`badge badge--${s.tone === "muted" ? "info" : s.tone}`}>{s.label}</span>;
}

/** Cuadro de pequeñas barras: ingresos por día. Accesible: cada barra tiene su valor en texto. */
export function Bars({ rows, format }: { rows: { label: string; value: number; sub?: string }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="bars" aria-label="Ingresos de los últimos 7 días">
      {rows.map((r) => (
        <li key={r.label} className="bars__col">
          <span className="bars__val">{format(r.value)}</span>
          <span className="bars__bar" style={{ height: `${Math.max(3, Math.round((r.value / max) * 68))}%` }} aria-hidden="true" />
          <span className="bars__lbl">{r.label}</span>
        </li>
      ))}
    </ul>
  );
}
