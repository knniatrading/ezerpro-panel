import { NextResponse, type NextRequest } from "next/server";

// En la dirección principal (ezerpro.com) la página de inicio es la página de ventas.
// En el resto de direcciones (panel, negocios) "/" sigue siendo el panel.
const LANDING = (process.env.LANDING_HOSTS ?? "ezerpro.com,www.ezerpro.com").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (req.nextUrl.pathname === "/" && LANDING.includes(host)) {
    return NextResponse.rewrite(new URL("/plataforma", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
