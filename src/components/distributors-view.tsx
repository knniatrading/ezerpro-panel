"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";
import { StatusBadge } from "./status-badge";
import { NewDistributorDialog } from "./new-distributor-dialog";
import { IconPlus, IconRefresh } from "./icons";
import { useResource } from "@/lib/use-resource";
import { formatDate } from "@/lib/format";
import type { Distributor } from "@/lib/types";

export function DistributorsView() {
  const { state } = useSession();
  const router = useRouter();
  const isSuper = state.status === "in" && state.user.role === "SUPER_ADMIN";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.status === "in" && state.user.role !== "SUPER_ADMIN") router.replace("/");
  }, [state, router]);

  const { data, error, loading, reload } = useResource<Distributor[]>(
    isSuper ? "/distributors" : null,
  );
  if (!isSuper) return null;
  const list = data ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Distribuidores</h1>
          <p className="lede">
            Cada distribuidor tiene su propio dominio y administra a sus clientes.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
          <IconPlus />
          <span>Nuevo distribuidor</span>
        </button>
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

      {loading && !data ? <p className="muted">Cargando distribuidores…</p> : null}

      {!loading && !error && list.length === 0 ? (
        <section className="note">
          <h2>Aún no hay distribuidores</h2>
          <p>
            Crea el primero: define su empresa, su dominio y la cuenta con la que entrará a su
            panel.
          </p>
          <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
            Crear distribuidor
          </button>
        </section>
      ) : null}

      {list.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Empresa</th>
                <th scope="col">Dominio</th>
                <th scope="col" className="num">
                  Clientes
                </th>
                <th scope="col">Estado</th>
                <th scope="col">Creado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="strong">{d.companyName}</span>
                    <span className="sub">{d.user.email}</span>
                  </td>
                  <td>{d.domain}</td>
                  <td className="num">{d._count.tenants}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="nowrap">{formatDate(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <NewDistributorDialog open={open} onClose={() => setOpen(false)} onCreated={reload} />
    </div>
  );
}
