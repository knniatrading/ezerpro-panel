"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";
import { StatusBadge } from "./status-badge";
import { IconRefresh } from "./icons";
import { useResource } from "@/lib/use-resource";
import { formatDate } from "@/lib/format";
import type { Tenant } from "@/lib/types";

export function TenantsView() {
  const { state } = useSession();
  const router = useRouter();
  const isSuper = state.status === "in" && state.user.role === "SUPER_ADMIN";

  useEffect(() => {
    if (state.status === "in" && state.user.role !== "SUPER_ADMIN") router.replace("/");
  }, [state, router]);

  const { data, error, loading, reload } = useResource<Tenant[]>(isSuper ? "/tenants" : null);
  if (!isSuper) return null;
  const tenants = data ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Clientes</h1>
          <p className="lede">Todos los negocios de la red, de todos los distribuidores.</p>
        </div>
      </header>

      {error ? (
        <div className="banner banner--error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={reload}>
            <IconRefresh />
            <span>Reintentar</span>
          </button>
        </div>
      ) : null}

      {loading && !data ? <p className="muted">Cargando clientes…</p> : null}

      {!loading && !error && tenants.length === 0 ? (
        <section className="note">
          <h2>Todavía no hay clientes</h2>
          <p>
            Los clientes los crea cada distribuidor. Cuando haya el primero, lo verás aquí con su
            dirección y su estado.
          </p>
        </section>
      ) : null}

      {tenants.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Dirección</th>
                <th scope="col">Distribuidor</th>
                <th scope="col">Estado</th>
                <th scope="col">Creado</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="strong">{t.name}</td>
                  <td>{t.address}</td>
                  <td>{t.distributor.companyName}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="nowrap">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
