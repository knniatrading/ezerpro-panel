import type { Metadata } from "next";
import { SalonBookingPage } from "@/components/salon-public";

export const metadata: Metadata = { title: "Reservar cita" };

export default function Page() {
  return <SalonBookingPage />;
}
