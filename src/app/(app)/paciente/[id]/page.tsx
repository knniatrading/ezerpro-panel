import type { Metadata } from "next";
import { VetPetView } from "@/components/vet-pet";

export const metadata: Metadata = { title: "Ficha de la mascota" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VetPetView id={id} />;
}
