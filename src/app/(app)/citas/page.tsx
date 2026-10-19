import type { Metadata } from "next";
import { VetAppointmentsView } from "@/components/vet-appointments";

export const metadata: Metadata = { title: "Citas" };

export default function Page() {
  return <VetAppointmentsView />;
}
