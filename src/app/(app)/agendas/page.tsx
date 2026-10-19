import type { Metadata } from "next";
import { ClinicAgendasView } from "@/components/clinic-agendas";

export const metadata: Metadata = { title: "Agendas y servicios" };

export default function Page() {
  return <ClinicAgendasView />;
}
