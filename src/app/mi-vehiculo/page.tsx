import type { Metadata } from "next";
import { TallerPortalView } from "@/components/taller-portal";

export const metadata: Metadata = { title: "Mi vehículo", robots: { index: false } };

export default function Page() {
  return <TallerPortalView />;
}
