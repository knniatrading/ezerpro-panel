import type { Metadata } from "next";
import { SalonClientsView } from "@/components/salon-clients";

export const metadata: Metadata = { title: "Clientes" };

export default function Page() {
  return <SalonClientsView />;
}
