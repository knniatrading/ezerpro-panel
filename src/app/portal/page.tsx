import type { Metadata } from "next";
import { VetPortalView } from "@/components/vet-portal";

export const metadata: Metadata = { title: "Portal de mascotas", robots: { index: false } };

export default function Page() {
  return <VetPortalView />;
}
