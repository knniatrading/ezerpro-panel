import type { Metadata } from "next";
import { GymPortalView } from "@/components/gym-portal";

export const metadata: Metadata = { title: "Portal del socio", robots: { index: false } };

export default function Page() {
  return <GymPortalView />;
}
