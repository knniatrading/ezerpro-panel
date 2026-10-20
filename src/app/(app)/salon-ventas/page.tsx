import type { Metadata } from "next";
import { SalonSalesView } from "@/components/salon-sales";

export const metadata: Metadata = { title: "Ventas" };

export default function Page() {
  return <SalonSalesView />;
}
