import type { Metadata } from "next";
import { FerreSellersView } from "@/components/ferre-sellers";

export const metadata: Metadata = { title: "Vendedores" };

export default function Page() {
  return <FerreSellersView />;
}
