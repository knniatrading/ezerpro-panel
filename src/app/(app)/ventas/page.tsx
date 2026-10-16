import type { Metadata } from "next";
import { SalesView } from "@/components/sales-view";

export const metadata: Metadata = { title: "Mis ventas" };

export default function Page() {
  return <SalesView />;
}
