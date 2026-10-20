import type { Metadata } from "next";
import { SalonCommissionsRoute } from "@/components/salon-commissions";

export const metadata: Metadata = { title: "Comisiones" };

export default function Page() {
  return <SalonCommissionsRoute />;
}
