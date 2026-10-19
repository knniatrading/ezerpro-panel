import type { Metadata } from "next";
import { VetPetIdView } from "@/components/vet-petid";

export const metadata: Metadata = { title: "Pet ID" };

export default function Page() {
  return <VetPetIdView />;
}
