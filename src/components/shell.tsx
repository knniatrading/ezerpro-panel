"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "./session";
import { Logo } from "./brand";
import { TenantLanding } from "./tenant-landing";
import { IconLogout, IconNetwork, IconOverview, IconStore } from "./icons";
import { roleLabel } from "@/lib/format";

const SUPER_NAV = [
  { href: "/", label: "Resumen", icon: IconOverview },
  { href: "/distribuidores", label: "Distribuidores", icon: IconNetwork },
  { href: "/clientes", label: "Clientes", icon: IconStore },
];
const DIST_NAV = [
  { href: "/", label: "Resumen", icon: IconOverview },
  { href: "/clientes", label: "Mis clientes", icon: IconStore },
];
const BASIC_NAV = [{ href: "/", label: "Inicio", icon: IconOverview }];

export function Shell({ children }: { children: ReactNode }) {
  const { state, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // En la dirección de un cliente (no "panel."), la portada es su página de bienvenida.
  const onTenantHost =
    typeof window !== "undefined" && !window.location.hostname.startsWith("panel.");
  const showLanding = state.status === "out" && pathname === "/" && onTenantHost;

  useEffect(() => {
    if (state.status === "out" && !showLanding) router.replace("/login");
  }, [state.status, showLanding, router]);

  if (showLanding) return <TenantLanding />;

  if (state.status !== "in") {
    return (
      <div className="boot" role="status" aria-live="polite">
        <Logo tone="light" />
        <span className="boot__text">
          {state.status === "loading" ? "Cargando…" : "Redirigiendo al inicio de sesión…"}
        </span>
      </div>
    );
  }

  const { user } = state;
  const nav =
    user.role === "SUPER_ADMIN"
      ? SUPER_NAV
      : user.role === "DISTRIBUTOR_ADMIN"
        ? DIST_NAV
        : BASIC_NAV;
  const displayName = user.distributor?.companyName ?? user.tenant?.name ?? user.email;

  return (
    <div className="shell">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Link href="/" aria-label="EzerPro, ir al inicio">
            <Logo tone="dark" />
          </Link>
        </div>
        <nav className="sidebar__nav" aria-label="Principal">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navlink${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar__account">
          <div className="account__who">
            <span className="account__name">{displayName}</span>
            <span className="account__role">{roleLabel(user.role)}</span>
          </div>
          <button type="button" className="btn btn--ghost-dark" onClick={logout}>
            <IconLogout />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <main className="main" id="contenido" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
