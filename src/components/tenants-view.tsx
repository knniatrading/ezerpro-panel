"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";
import { StatusBadge } from "./status-badge";
import { NewTenantDialog } from "./new-tenant-dialog";
import { IconPlus, IconRefresh } from "./icons";
import { useResource } from "@/lib/use-resource";
import { formatDate } from "@/lib/format";
import type { Tenant } from "@/lib/types";

export function TenantsView() {
  const { state } = useSession();
  const router = useRouter();
  const role = state.status === "in" ? state.user.role : null;
  const isSuper = role === "SUPER_ADMIN";
  const isDist = role === "DISTRIBUTOR_ADMIN";
  const domain = state.status === "in" ? (state.user.distributor?.domain ?? "") : "";
  const [open, setOpen] = useState(false);
  const [adminFor, setAdminFor] = useState<Tenant | null>(null);

  useEffect(() => {
    if (state.status === "in" && !isSuper && !isDist) router.replace("/");
  }, [state, isSuper, isDist, router]);

  const { data, error, loading, reload } = useResource<Tenant[]>(
    isSuper || isDist ? "/tenants" : null,
  );
  if (!isSuper && !isDist) return null;
  const tenants = data ?? [];

  function openNew() {
    setAdminFor(null);
    setOpen(true);
  }
  function openAdmin(t: Tenant) {
    setAdminFor(t);
    setOpen(true);
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{isDist ? "Mis clientes" : "Clientes"}</h1>
          <p className="lede">
            {isDist
              ? "Los negocios que tienen su plataforma contigo. Cada uno vive en su propia dirección."
              : "Todos los negocios de la red, de todos los distribuidores."}
          </p>
        </div>
        {isDist ? (
          <button type="button" className="btn btn--primary" onClick={openNew}>
            <IconPlus />
            <span>Nuevo cliente</span>
          </button>
        ) : null}
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
          {isDist ? (
            <>
              <p>
                Crea tu primer cliente: pon el nombre del negocio, elige su dirección y define la
                cuenta con la que entrará a administrarlo.
              </p>
              <button type="button" className="btn btn--primary" onClick={openNew}>
                Crear cliente
              </button>
            </>
          ) : (
            <p>
              Los clientes los crea cada distribuidor. Cuando haya el primero, lo verás aquí con su
              dirección y su estado.
            </p>
          )}
        </section>
      ) : null}

      {tenants.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Dirección</th>
                {isSuper ? <th scope="col">Distribuidor</th> : null}
                <th scope="col">Administrador</th>
                <th scope="col">Estado</th>
                <th scope="col">Creado</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="strong">{t.name}</td>
                  <td>{t.address}</td>
                  {isSuper ? <td>{t.distributor.companyName}</td> : null}
                  <td>
                    {t._count.users > 0 ? (
                      <span className="muted">Creado</span>
                    ) : isDist ? (
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => openAdmin(t)}>
                        Crear administrador
                      </button>
                    ) : (
                      <span className="muted">Sin administrador</span>
                    )}
                  </td>
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

      {isDist ? (
        <NewTenantDialog
          open={open}
          tenant={adminFor}
          domain={domain}
          onClose={() => setOpen(false)}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}
