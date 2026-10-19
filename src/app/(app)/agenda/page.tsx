import type { Metadata } from "next";
import { ClinicAgendaView } from "@/components/clinic-agenda";

export const metadata: Metadata = { title: "Agenda" };

export default function Page() {
  return <ClinicAgendaView />;
}
