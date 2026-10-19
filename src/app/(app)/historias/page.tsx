import type { Metadata } from "next";
import { ClinicPatientsView } from "@/components/clinic-patients";

export const metadata: Metadata = { title: "Pacientes" };

export default function Page() {
  return <ClinicPatientsView />;
}
