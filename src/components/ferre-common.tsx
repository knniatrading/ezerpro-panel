"use client";

import { useEffect } from "react";
import { useSession } from "./session";
import { formatMoney } from "@/lib/format";
import { METHOD_TEXT, fmtQty } from "@/lib/ferre";
import type { FerreSaleDetail } from "@/lib/types";
export { errMsg, Dlg } from "./clinic-common";
export { NumInput } from "./taller-common";

export const ADMIN = ["TENANT_ADMIN"];
export const ALL = ["TENANT_ADMIN", "CASHIER"];

export function useFerreAccess(roles: string[] = ALL) {
  const { state } = useSession();
  const allowed = state.status === "in" && roles.includes(state.user.role) && !!state.user.tenant?.modules?.includes("ferreteria");
  return { state, allowed, role: state.status === "in" ? state.user.role : "" };
}

const dt = (iso: string) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Recibo para imprimir (tirilla): solo se ve al imprimir. */
export function FerreReceipt({ detail }: { detail: FerreSaleDetail }) {
  const { sale: s, shop } = detail;
  return (
    <div className="fe-print" aria-hidden="true">
      <div className="fe-ticket">
        <p className="fe-ticket__name">{shop.name}</p>
        {shop.nit ? <p>NIT {shop.nit}</p> : null}
        {shop.address ? <p>{shop.address}</p> : null}
        {shop.phone ? <p>Tel. {shop.phone}</p> : null}
        <p className="fe-ticket__rule">Venta #{s.number} · {dt(s.createdAt)}</p>
        {s.customerName ? <p>Cliente: {s.customerName}</p> : null}
        <table><tbody>
          {s.items.map((i) => (
            <tr key={i.id}><td>{fmtQty(i.qty)} {i.unit} {i.name}<br /><small>a {formatMoney(i.unitPrice)}</small></td><td>{formatMoney(i.total)}</td></tr>
          ))}
        </tbody></table>
        <p className="fe-ticket__rule" />
        {s.discount ? <p className="fe-ticket__row"><span>Subtotal</span><span>{formatMoney(s.subtotal)}</span></p> : null}
        {s.discount ? <p className="fe-ticket__row"><span>Descuento</span><span>-{formatMoney(s.discount)}</span></p> : null}
        <p className="fe-ticket__row fe-ticket__total"><span>TOTAL</span><span>{formatMoney(s.total)}</span></p>
        <p className="fe-ticket__row"><span>Pago</span><span>{METHOD_TEXT[s.method] ?? s.method}</span></p>
        {s.method === "credito" ? <p className="fe-ticket__row"><span>Saldo a crédito</span><span>{formatMoney(s.total - s.paid)}</span></p> : null}
        <p className="fe-ticket__rule">Atendió: {s.createdByName ?? "—"}</p>
        <p>¡Gracias por su compra!</p>
      </div>
    </div>
  );
}

/** Dispara la impresión cuando hay un recibo listo. */
export function usePrintWhen(detail: FerreSaleDetail | null, done: () => void) {
  useEffect(() => {
    if (!detail) return;
    const t = setTimeout(() => { window.print(); done(); }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);
}
