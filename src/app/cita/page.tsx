import type { Metadata } from "next";
import { ClinicApptPage } from "@/components/clinic-docs-public";

export const metadata: Metadata = { title: "Tu cita", robots: { index: false } };

export default function Page() {
  return <ClinicApptPage />;
}
