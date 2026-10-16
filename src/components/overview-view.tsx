"use client";

import Link from "next/link";
import { useSession } from "./session";
import { ComingSoon } from "./coming-soon";
import { StatusBadge } from "./status-badge";
import { IconRefresh } from "./icons";
import { useResource } from "@/lib/use-resource";
import { formatDate } from "@/lib/format";
import type { Distributor, Tenant } from "@/lib/types";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function Tier({
  level,
  value,
  title,
  note,
}: {
  level: 0 | 1 | 2;
  value: number | null;
  title: string;
  note: string;
}) {
  return (
    <div className={`tier tier--${level}`}>
      <span className="tier__num">{value ?? "–"}</span>
      <span className="tier__text">
        <span className="tier__title">{title}</span>
        <span className="tier__note">{note}</span>
      </span>
    </div>
  );
}

function SuperOverview() {
  const dist = useResource<Distributor[]>("/distributors");
  const ten = useResource<Tenant[]>("/tenants");
  const loading = dist.loading || ten.loading;
  const error = dist.error ?? ten.error;
  const distributors = dist.data ?? [];
  const tenants = ten.data ?? [];
  const ready = !loading && !error;

  const activeD = distributors.filter((d) => d.status === "active").length;
  const trial = tenants.filter((t) => t.status === "trial").length;
  const activeT = tenants.filter((t) => t.status === "active").length;

  const distNote = !ready
    ? "Cargando…"
    : distributors.length === 0
      ? "Aún no hay ninguno"
      : plural(activeD, "activo", "activos");
  const tenNote = !ready
    ? "Cargando…"
    : tenants.length === 0
      ? "Aún no hay ninguno"
      : `${trial} en prueba, ${plural(activeT, "activo", "activos")}`;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Resumen</h1>
          <p className="lede">Así está hoy la estructura de tu red.</p>
        </div>
      </header>

      {error ? (
        <div className="banner banner--error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => {
              dist.reload();
              ten.reload();
            }}
          >
            <IconRefresh />
            <span>Reintentar</span>
          </button>
        </div>
      ) : null}

      <section className="stack" aria-label="Estructura de la red" aria-busy={loading}>
        <Tier level={0} value={1} title="Plataforma EzerPro" note="Tu cuenta de Super Admin" />
        <Tier
          level={1}
          value={ready ? distributors.length : null}
          title="Distribuidores"
          note={distNote}
        />
        <Tier level={2} value={ready ? tenants.length : null} title="Clientes" note={tenNote} />
      </section>

      {ready && distributors.length === 0 ? (
        <section className="note">
          <h2>Empieza creando tu primer distribuidor</h2>
          <p>
            Cada distribuidor trae su propio dominio y vende plataformas a sus clientes. Cuando lo
            crees, podrá iniciar sesión con el correo y la contraseña que definas.
          </p>
          <Link href="/distribuidores" className="btn btn--primary">
            Crear distribuidor
          </Link>
        </section>
      ) : null}

      {ready && distributors.length > 0 ? (
        <section className="block">
          <div className="block__head">
            <h2>Últimos clientes</h2>
            {tenants.length > 0 ? <Link href="/clientes">Ver todos</Link> : null}
          </div>
          {tenants.length === 0 ? (
            <p className="muted">
              Los clientes aparecerán aquí cuando un distribuidor cree el primero.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col">Dirección</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.slice(0, 5).map((t) => (
                    <tr key={t.id}>
                      <td className="strong">{t.name}</td>
                      <td>{t.address}</td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="nowrap">{formatDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

export function OverviewView() {
  const { state } = useSession();
  if (state.status !== "in") return null;
  if (state.user.role !== "SUPER_ADMIN") return <ComingSoon user={state.user} />;
  return <SuperOverview />;
}
