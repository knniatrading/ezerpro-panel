"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";
import { StatusBadge } from "./status-badge";
import { NewTenantDialog } from "./new-tenant-dialog";
import { PaymentDialog } from "./payment-dialog";
import { PaymentHistoryDialog } from "./payment-history-dialog";
import { StatusDialog, type StatusTarget } from "./status-dialog";
import { IconPlus, IconRefresh } from "./icons";
import { useResource } from "@/lib/use-resource";
import { payStatus } from "@/lib/format";
import type { Tenant } from "@/lib/types";

export function PayCell({ paidUntil }: { paidUntil: string | null }) {
  const pay = payStatus(paidUntil);
  return (
    <span className="pay">
      <span className={`pay__label pay__label--${pay.tone}`}>{pay.label}</span>
      <span className="pay__detail">{pay.detail}</span>
    </span>
  );
}

export function TenantsView() {
  const { state } = useSession();
  const router = useRouter();
  const role = state.status === "in" ? state.user.role : null;
  const isSuper = role === "SUPER_ADMIN";
  const isDist = role === "DISTRIBUTOR_ADMIN";
  const domain = state.status === "in" ? (state.user.distributor?.domain ?? "") : "";
  const [open, setOpen] = useState(false);
  const [adminFor, setAdminFor] = useState<Tenant | null>(null);
  const [payFor, setPayFor] = useState<Tenant | null>(null);
  const [historyFor, setHistoryFor] = useState<Tenant | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);

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
                {isSuper ? <th scope="col">Distribuidor</th> : null}
                <th scope="col">Administrador</th>
                <th scope="col">Estado</th>
                <th scope="col">Pago</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="strong">{t.name}</span>
                    <span className="sub">{t.address}</span>
                  </td>
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
                    {t.status === "suspended" && t.suspendedReason ? (
                      <span className="sub-reason">{t.suspendedReason}</span>
                    ) : null}
                  </td>
                  <td>
                    <PayCell paidUntil={t.paidUntil} />
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setPayFor(t)}
                      >
                        Registrar pago
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setHistoryFor(t)}
                      >
                        Pagos
                      </button>
                      {t.status === "suspended" ? (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() =>
                            setStatusTarget({ kind: "tenant", id: t.id, name: t.name, next: "active" })
                          }
                        >
                          Reactivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          onClick={() =>
                            setStatusTarget({ kind: "tenant", id: t.id, name: t.name, next: "suspended" })
                          }
                        >
                          Suspender
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <PaymentDialog tenant={payFor} onClose={() => setPayFor(null)} onDone={reload} />
      <PaymentHistoryDialog tenant={historyFor} onClose={() => setHistoryFor(null)} />
      <StatusDialog target={statusTarget} onClose={() => setStatusTarget(null)} onDone={reload} />

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
