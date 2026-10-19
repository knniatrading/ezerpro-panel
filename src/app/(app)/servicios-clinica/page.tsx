import type { Metadata } from "next";
import { VetServicesView } from "@/components/vet-services";

export const metadata: Metadata = { title: "Servicios" };

export default function Page() {
  return <VetServicesView />;
}
