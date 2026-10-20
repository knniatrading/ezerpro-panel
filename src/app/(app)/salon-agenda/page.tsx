import type { Metadata } from "next";
import { SalonAgendaView } from "@/components/salon-agenda";

export const metadata: Metadata = { title: "Agenda" };

export default function Page() {
  return <SalonAgendaView />;
}
