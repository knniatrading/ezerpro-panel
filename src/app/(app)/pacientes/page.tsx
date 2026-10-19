import type { Metadata } from "next";
import { VetPatientsView } from "@/components/vet-patients";

export const metadata: Metadata = { title: "Pacientes" };

export default function Page() {
  return <VetPatientsView />;
}
