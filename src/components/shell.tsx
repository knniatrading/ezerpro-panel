"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "./session";
import { Logo } from "./brand";
import { TenantBrand } from "./tenant-brand";
import { brandStyle } from "@/lib/brand";
import { TenantLanding } from "./tenant-landing";
import { IconCard, IconLogout, IconNetwork, IconOverview, IconStore, IconUser, IconBag, IconMenu, IconTeam, IconPalette, IconPos, IconTable, IconBike, IconReceipt, IconChart, IconWallet } from "./icons";
import { roleLabel } from "@/lib/format";

const SUPER_NAV = [
  { href: "/", label: "Resumen", icon: IconOverview },
  { href: "/distribuidores", label: "Distribuidores", icon: IconNetwork },
  { href: "/clientes", label: "Clientes", icon: IconStore },
  { href: "/pagos", label: "Pagos", icon: IconCard },
  { href: "/cuenta", label: "Mi cuenta", icon: IconUser },
];
const DIST_NAV = [
  { href: "/", label: "Resumen", icon: IconOverview },
  { href: "/clientes", label: "Mis clientes", icon: IconStore },
  { href: "/pagos", label: "Pagos", icon: IconCard },
  { href: "/cuenta", label: "Mi cuenta", icon: IconUser },
];
// Motor de módulos: el menú del negocio depende de los módulos de su nicho.
function tenantNav(modules: string[] | undefined, role: string) {
  const mods = modules ?? [];
  const nav = [{ href: "/", label: "Inicio", icon: IconOverview }];
  const staff = role === "TENANT_ADMIN" || role === "CASHIER" || role === "WAITER";
  if (mods.includes("pedidos") && staff) {
    nav.push({ href: "/vender", label: "Vender", icon: IconPos });
    nav.push({ href: "/pedidos", label: "Pedidos", icon: IconBag });
  }
  if (mods.includes("pedidos") && (role === "TENANT_ADMIN" || role === "CASHIER")) {
    nav.push({ href: "/domicilios", label: "Domicilios", icon: IconBike });
    nav.push({ href: "/caja", label: "Caja", icon: IconCard });
    nav.push({ href: "/ventas", label: "Mis ventas", icon: IconReceipt });
  }
  if (mods.includes("pedidos") && role === "DRIVER") {
    nav.push({ href: "/entregas", label: "Mis entregas", icon: IconBike });
  }
  if (role === "TENANT_ADMIN") {
    if (mods.includes("menu")) nav.push({ href: "/menu", label: "Menú", icon: IconMenu });
    if (mods.includes("pedidos")) nav.push({ href: "/mesas", label: "Mesas", icon: IconTable });
    if (mods.includes("pedidos")) nav.push({ href: "/metricas", label: "Métricas", icon: IconChart });
    nav.push({ href: "/equipo", label: "Equipo", icon: IconTeam });
    nav.push({ href: "/nomina", label: "Nómina", icon: IconWallet });
    nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
  }
  nav.push({ href: "/cuenta", label: "Mi cuenta", icon: IconUser });
  return nav;
}

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

  const tenantName = state.status === "in" ? state.user.tenant?.name : undefined;
  useEffect(() => {
    if (tenantName) document.title = document.title.replace(/\| EzerPro$/, `| ${tenantName}`);
  }, [tenantName, pathname]);

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
        : tenantNav(user.tenant?.modules, user.role);
  const displayName = user.distributor?.companyName ?? user.tenant?.name ?? user.email;

  return (
    <div className="shell" style={brandStyle(user.tenant?.brandColor)}>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Link href="/" aria-label={`${displayName}, ir al inicio`}>
            {user.tenant ? (
              <TenantBrand name={user.tenant.name} logo={user.tenant.logo} tone="dark" />
            ) : (
              <Logo tone="dark" />
            )}
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
