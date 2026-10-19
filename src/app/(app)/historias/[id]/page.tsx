import type { Metadata } from "next";
import { ClinicPatientView } from "@/components/clinic-patient";

export const metadata: Metadata = { title: "Paciente" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClinicPatientView id={id} />;
}
