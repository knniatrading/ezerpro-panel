import type { Metadata } from "next";
import { SalesPage } from "@/components/sales-page";

export const metadata: Metadata = {
  title: { absolute: "EzerPro: software para negocios, con tu marca y tu dominio" },
  description: "Ofrece software para negocios bajo tu propia marca. Prueba cada nicho con un demo de administrador y de cliente.",
  robots: { index: true, follow: true },
};

export default function Page() {
  return <SalesPage />;
}
