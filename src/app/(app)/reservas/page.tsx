import type { Metadata } from "next";
import { TallerBookingsView } from "@/components/taller-reminders";

export const metadata: Metadata = { title: "Solicitudes de cita" };

export default function Page() {
  return <TallerBookingsView />;
}
