"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "./session";
import { Logo } from "./brand";
import { TenantBrand } from "./tenant-brand";
import { brandStyle } from "@/lib/brand";
import { TenantLanding } from "./tenant-landing";
import { IconCard, IconLogout, IconNetwork, IconOverview, IconStore, IconUser, IconBag, IconMenu, IconTeam, IconPalette, IconPos, IconTable, IconBike, IconReceipt, IconChart, IconWallet, IconSpark, IconInbox, IconIdCard, IconTag, IconShield } from "./icons";
import { roleLabel, setRoleContext } from "@/lib/format";

const SUPER_NAV = [
  { href: "/", label: "Resumen", icon: IconOverview },
  { href: "/distribuidores", label: "Distribuidores", icon: IconNetwork },
  { href: "/clientes", label: "Clientes", icon: IconStore },
  { href: "/pagos", label: "Pagos", icon: IconCard },
  { href: "/demos", label: "Demos", icon: IconSpark },
  { href: "/actividad", label: "Actividad", icon: IconShield },
  { href: "/cuenta", label: "Mi cuenta", icon: IconUser },
];
const DIST_NAV = [
  { href: "/", label: "Resumen", icon: IconOverview },
  { href: "/clientes", label: "Mis clientes", icon: IconStore },
  { href: "/pagos", label: "Pagos", icon: IconCard },
  { href: "/demos", label: "Demos", icon: IconSpark },
  { href: "/actividad", label: "Actividad", icon: IconShield },
  { href: "/cuenta", label: "Mi cuenta", icon: IconUser },
];
// Motor de módulos: el menú del negocio depende de los módulos de su nicho.
function tenantNav(modules: string[] | undefined, role: string) {
  const mods = modules ?? [];
  const nav = [{ href: "/", label: "Inicio", icon: IconOverview }];
  const staff = role === "TENANT_ADMIN" || role === "CASHIER" || role === "WAITER";
  if (mods.includes("gimnasio")) {
    if (role === "TENANT_ADMIN") {
      nav.push({ href: "/acceso", label: "Acceso", icon: IconIdCard });
      nav.push({ href: "/socios", label: "Socios", icon: IconTeam });
      nav.push({ href: "/planes", label: "Planes", icon: IconTag });
      nav.push({ href: "/clases", label: "Clases", icon: IconReceipt });
      nav.push({ href: "/rutinas", label: "Rutinas", icon: IconSpark });
      nav.push({ href: "/menu", label: "Productos", icon: IconMenu });
      nav.push({ href: "/pedidos", label: "Pedidos", icon: IconBag });
      nav.push({ href: "/vender", label: "Vender", icon: IconPos });
      nav.push({ href: "/caja", label: "Caja", icon: IconCard });
      nav.push({ href: "/ventas", label: "Mis ventas", icon: IconReceipt });
      nav.push({ href: "/equipo", label: "Equipo", icon: IconTeam });
      nav.push({ href: "/nomina", label: "Nómina", icon: IconWallet });
      nav.push({ href: "/mi-gimnasio", label: "Mi gimnasio y QR", icon: IconIdCard });
      nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
      nav.push({ href: "/actividad", label: "Actividad", icon: IconShield });
    } else if (role === "CASHIER") {
      nav.push({ href: "/acceso", label: "Acceso", icon: IconIdCard });
      nav.push({ href: "/socios", label: "Socios", icon: IconTeam });
      nav.push({ href: "/clases", label: "Clases", icon: IconReceipt });
      nav.push({ href: "/vender", label: "Vender", icon: IconPos });
      nav.push({ href: "/caja", label: "Caja", icon: IconCard });
      nav.push({ href: "/ventas", label: "Mis ventas", icon: IconReceipt });
    } else if (role === "EMPLOYEE") {
      nav.push({ href: "/rutinas", label: "Rutinas", icon: IconSpark });
      nav.push({ href: "/clases", label: "Clases", icon: IconReceipt });
    }
    nav.push({ href: "/cuenta", label: "Mi cuenta", icon: IconUser });
    return nav;
  }
  if (mods.includes("residencial")) {
    if (role === "TENANT_ADMIN") {
      nav.push({ href: "/porteria", label: "Portería", icon: IconShield });
      nav.push({ href: "/cj-unidades", label: "Unidades y propietarios", icon: IconTeam });
      nav.push({ href: "/cj-cartera", label: "Cartera y cuotas", icon: IconCard });
      nav.push({ href: "/cj-areas", label: "Áreas comunes", icon: IconTable });
      nav.push({ href: "/cj-asambleas", label: "Asambleas", icon: IconChart });
      nav.push({ href: "/cj-cartelera", label: "Cartelera", icon: IconTag });
      nav.push({ href: "/cj-pqrs", label: "PQRS", icon: IconInbox });
      nav.push({ href: "/cj-censo", label: "Vehículos y mascotas", icon: IconBike });
      nav.push({ href: "/equipo", label: "Equipo", icon: IconTeam });
      nav.push({ href: "/mi-conjunto", label: "Mi conjunto y QR", icon: IconIdCard });
      nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
      nav.push({ href: "/actividad", label: "Actividad", icon: IconShield });
    } else if (role === "CASHIER") {
      nav.push({ href: "/porteria", label: "Portería", icon: IconShield });
      nav.push({ href: "/cj-asambleas", label: "Asambleas", icon: IconChart });
      nav.push({ href: "/cj-areas", label: "Áreas comunes", icon: IconTable });
      nav.push({ href: "/cj-censo", label: "Vehículos y mascotas", icon: IconBike });
      nav.push({ href: "/cj-cartelera", label: "Cartelera", icon: IconTag });
    } else if (role === "EMPLOYEE") {
      nav.push({ href: "/cj-asambleas", label: "Asambleas", icon: IconChart });
      nav.push({ href: "/cj-cartera", label: "Cartera (consulta)", icon: IconCard });
      nav.push({ href: "/cj-unidades", label: "Unidades y propietarios", icon: IconTeam });
      nav.push({ href: "/cj-pqrs", label: "PQRS", icon: IconInbox });
      nav.push({ href: "/cj-cartelera", label: "Cartelera", icon: IconTag });
      nav.push({ href: "/cj-areas", label: "Áreas comunes", icon: IconTable });
    }
    nav.push({ href: "/cuenta", label: "Mi cuenta", icon: IconUser });
    return nav;
  }
  if (mods.includes("belleza")) {
    if (role === "TENANT_ADMIN") {
      nav.push({ href: "/salon-agenda", label: "Agenda", icon: IconReceipt });
      nav.push({ href: "/salon-clientes", label: "Clientes", icon: IconTeam });
      nav.push({ href: "/salon-caja", label: "Caja", icon: IconPos });
      nav.push({ href: "/salon-ventas", label: "Ventas", icon: IconCard });
      nav.push({ href: "/salon-comisiones", label: "Comisiones", icon: IconChart });
      nav.push({ href: "/salon-productos", label: "Productos", icon: IconBag });
      nav.push({ href: "/salon-equipo", label: "Profesionales y servicios", icon: IconTag });
      nav.push({ href: "/equipo", label: "Equipo", icon: IconTeam });
      nav.push({ href: "/mi-salon", label: "Mi salón y QR", icon: IconIdCard });
      nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
      nav.push({ href: "/actividad", label: "Actividad", icon: IconShield });
    } else if (role === "CASHIER") {
      nav.push({ href: "/salon-agenda", label: "Agenda", icon: IconReceipt });
      nav.push({ href: "/salon-clientes", label: "Clientes", icon: IconTeam });
      nav.push({ href: "/salon-caja", label: "Caja", icon: IconPos });
      nav.push({ href: "/salon-ventas", label: "Mis ventas", icon: IconCard });
      nav.push({ href: "/salon-productos", label: "Productos", icon: IconBag });
    } else if (role === "EMPLOYEE") {
      nav.push({ href: "/salon-agenda", label: "Mi agenda", icon: IconReceipt });
      nav.push({ href: "/salon-clientes", label: "Clientes", icon: IconTeam });
      nav.push({ href: "/salon-comisiones", label: "Mis comisiones", icon: IconChart });
    }
    nav.push({ href: "/cuenta", label: "Mi cuenta", icon: IconUser });
    return nav;
  }
  if (mods.includes("clinica")) {
    if (role === "TENANT_ADMIN") {
      nav.push({ href: "/agenda", label: "Agenda", icon: IconReceipt });
      nav.push({ href: "/historias", label: "Pacientes", icon: IconTeam });
      nav.push({ href: "/cobros", label: "Cobros", icon: IconCard });
      nav.push({ href: "/agendas", label: "Agendas y servicios", icon: IconTag });
      nav.push({ href: "/consentimientos", label: "Consentimientos", icon: IconShield });
      nav.push({ href: "/equipo", label: "Equipo", icon: IconTeam });
      nav.push({ href: "/nomina", label: "Nómina", icon: IconWallet });
      nav.push({ href: "/mi-consultorio", label: "Mi consultorio y QR", icon: IconIdCard });
      nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
      nav.push({ href: "/actividad", label: "Actividad", icon: IconShield });
    } else if (role === "CASHIER") {
      nav.push({ href: "/agenda", label: "Agenda", icon: IconReceipt });
      nav.push({ href: "/historias", label: "Pacientes", icon: IconTeam });
      nav.push({ href: "/cobros", label: "Cobros", icon: IconCard });
    } else if (role === "EMPLOYEE") {
      nav.push({ href: "/agenda", label: "Agenda", icon: IconReceipt });
      nav.push({ href: "/historias", label: "Pacientes", icon: IconTeam });
    }
    nav.push({ href: "/cuenta", label: "Mi cuenta", icon: IconUser });
    return nav;
  }
  if (mods.includes("ferreteria")) {
    if (role === "TENANT_ADMIN") {
      nav.push({ href: "/pos", label: "Punto de venta", icon: IconPos });
      nav.push({ href: "/inventario", label: "Inventario", icon: IconBag });
      nav.push({ href: "/ventas-mostrador", label: "Pedidos y ventas", icon: IconReceipt });
      nav.push({ href: "/vendedores", label: "Vendedores", icon: IconChart });
      nav.push({ href: "/cuentas", label: "Cuentas por cobrar", icon: IconWallet });
      nav.push({ href: "/cotizaciones", label: "Cotizaciones", icon: IconInbox });
      nav.push({ href: "/equipo", label: "Equipo", icon: IconTeam });
      nav.push({ href: "/mi-ferreteria", label: "Mi ferretería y QR", icon: IconTag });
      nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
      nav.push({ href: "/actividad", label: "Actividad", icon: IconShield });
    } else if (role === "CASHIER") {
      nav[0] = { href: "/", label: "Punto de venta", icon: IconPos };
      nav.push({ href: "/ventas-mostrador", label: "Pedidos y mis ventas", icon: IconReceipt });
      nav.push({ href: "/cuentas", label: "Cuentas por cobrar", icon: IconWallet });
      nav.push({ href: "/cotizaciones", label: "Cotizaciones", icon: IconInbox });
      nav.push({ href: "/inventario", label: "Consultar inventario", icon: IconBag });
    }
    nav.push({ href: "/cuenta", label: "Mi cuenta", icon: IconUser });
    return nav;
  }
  if (mods.includes("taller")) {
    if (role === "TENANT_ADMIN") {
      nav.push({ href: "/ordenes", label: "Órdenes", icon: IconReceipt });
      nav.push({ href: "/vehiculos", label: "Vehículos", icon: IconIdCard });
      nav.push({ href: "/repuestos", label: "Repuestos", icon: IconBag });
      nav.push({ href: "/mecanicos", label: "Mecánicos", icon: IconTeam });
      nav.push({ href: "/recordatorios", label: "Recordatorios", icon: IconSpark });
      nav.push({ href: "/reservas", label: "Citas", icon: IconInbox });
      nav.push({ href: "/ingresos", label: "Ingresos", icon: IconCard });
      nav.push({ href: "/equipo", label: "Equipo", icon: IconTeam });
      nav.push({ href: "/nomina", label: "Nómina", icon: IconWallet });
      nav.push({ href: "/mi-taller", label: "Mi taller y QR", icon: IconTag });
      nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
      nav.push({ href: "/actividad", label: "Actividad", icon: IconShield });
    } else if (role === "CASHIER") {
      nav.push({ href: "/ordenes", label: "Órdenes", icon: IconReceipt });
      nav.push({ href: "/vehiculos", label: "Vehículos", icon: IconIdCard });
      nav.push({ href: "/repuestos", label: "Repuestos", icon: IconBag });
      nav.push({ href: "/mecanicos", label: "Mecánicos", icon: IconTeam });
      nav.push({ href: "/recordatorios", label: "Recordatorios", icon: IconSpark });
      nav.push({ href: "/reservas", label: "Citas", icon: IconInbox });
      nav.push({ href: "/ingresos", label: "Ingresos", icon: IconCard });
    } else if (role === "EMPLOYEE") {
      nav.push({ href: "/ordenes", label: "Mis órdenes", icon: IconReceipt });
      nav.push({ href: "/vehiculos", label: "Vehículos", icon: IconIdCard });
      nav.push({ href: "/repuestos", label: "Repuestos", icon: IconBag });
    }
    nav.push({ href: "/cuenta", label: "Mi cuenta", icon: IconUser });
    return nav;
  }
  if (mods.includes("veterinaria") && role === "TENANT_ADMIN") {
    nav.push({ href: "/pacientes", label: "Pacientes", icon: IconTeam });
    nav.push({ href: "/citas", label: "Citas", icon: IconReceipt });
    nav.push({ href: "/servicios-clinica", label: "Servicios", icon: IconTag });
    nav.push({ href: "/menu", label: "Productos", icon: IconMenu });
    nav.push({ href: "/pedidos", label: "Pedidos", icon: IconBag });
    nav.push({ href: "/vender", label: "Vender", icon: IconPos });
    nav.push({ href: "/caja", label: "Caja", icon: IconCard });
    nav.push({ href: "/ventas", label: "Mis ventas", icon: IconReceipt });
    nav.push({ href: "/mi-clinica", label: "Mi clínica y QR", icon: IconIdCard });
    nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
    nav.push({ href: "/actividad", label: "Actividad", icon: IconShield });
    nav.push({ href: "/cuenta", label: "Mi cuenta", icon: IconUser });
    return nav;
  }
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
  if (mods.includes("tarjeta") && role === "TENANT_ADMIN") {
    nav.push({ href: "/solicitudes", label: "Solicitudes", icon: IconInbox });
    nav.push({ href: "/historial", label: "Historial y ganancias", icon: IconReceipt });
    nav.push({ href: "/mi-tarjeta", label: "Mi tarjeta y QR", icon: IconIdCard });
    nav.push({ href: "/tarifas", label: "Tarifas y servicios", icon: IconTag });
    nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
    nav.push({ href: "/actividad", label: "Actividad", icon: IconShield });
  }
  if (mods.includes("tecnico") && role === "TENANT_ADMIN") {
    nav.push({ href: "/mi-pagina", label: "Mi página y QR", icon: IconIdCard });
    nav.push({ href: "/servicios", label: "Servicios", icon: IconTag });
    nav.push({ href: "/galeria", label: "Galería", icon: IconSpark });
    nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
    nav.push({ href: "/actividad", label: "Actividad", icon: IconShield });
  }
  if (role === "TENANT_ADMIN" && !mods.includes("tarjeta") && !mods.includes("tecnico")) {
    if (mods.includes("menu")) nav.push({ href: "/menu", label: "Menú", icon: IconMenu });
    if (mods.includes("pedidos")) nav.push({ href: "/mesas", label: "Mesas", icon: IconTable });
    if (mods.includes("pedidos")) nav.push({ href: "/metricas", label: "Métricas", icon: IconChart });
    nav.push({ href: "/equipo", label: "Equipo", icon: IconTeam });
    nav.push({ href: "/nomina", label: "Nómina", icon: IconWallet });
    nav.push({ href: "/marca", label: "Marca", icon: IconPalette });
    nav.push({ href: "/actividad", label: "Actividad", icon: IconShield });
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
  setRoleContext(user.tenant?.modules);
  const nav0 =
    user.role === "SUPER_ADMIN"
      ? SUPER_NAV
      : user.role === "DISTRIBUTOR_ADMIN"
        ? DIST_NAV
        : tenantNav(user.tenant?.modules, user.role);
  // En una sesión de demo no se muestra la gestión de demos.
  const nav = user.demo ? nav0.filter((i) => i.href !== "/demos") : nav0;
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
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
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
        {user.demo ? (
          <div className="demo-banner" role="note">
            <strong>Estás en un demo.</strong> Los datos son de ejemplo y se reinician cada noche. Puedes probar todo con confianza.
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
