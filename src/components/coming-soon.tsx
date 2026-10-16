import type { Me } from "@/lib/types";
import { roleLabel } from "@/lib/format";

export function ComingSoon({ user }: { user: Me }) {
  const who = user.distributor?.companyName ?? user.tenant?.name ?? user.email;
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Hola, {who}</h1>
          <p className="lede">Tu cuenta funciona y la sesión está activa.</p>
        </div>
      </header>
      <section className="note">
        <h2>Tu panel todavía no está disponible</h2>
        <p>
          Las herramientas de {roleLabel(user.role).toLowerCase()} se están construyendo y llegan
          en las próximas versiones.
        </p>
        {user.distributor ? (
          <dl className="facts">
            <div>
              <dt>Empresa</dt>
              <dd>{user.distributor.companyName}</dd>
            </div>
            <div>
              <dt>Dominio</dt>
              <dd>{user.distributor.domain}</dd>
            </div>
          </dl>
        ) : null}
        {user.tenant ? (
          <dl className="facts">
            <div>
              <dt>Negocio</dt>
              <dd>{user.tenant.name}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    </div>
  );
}
