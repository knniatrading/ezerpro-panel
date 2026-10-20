import type { Metadata } from "next";
import { SalonApptPage } from "@/components/salon-public";

export const metadata: Metadata = { title: "Tu cita" };

export default function Page() {
  return <SalonApptPage />;
}
