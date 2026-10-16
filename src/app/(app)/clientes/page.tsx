import type { Metadata } from "next";
import { TenantsView } from "@/components/tenants-view";

export const metadata: Metadata = { title: "Clientes" };

export default function TenantsPage() {
  return <TenantsView />;
}
