import type { Metadata } from "next";
import { SalonTeamView } from "@/components/salon-team";

export const metadata: Metadata = { title: "Profesionales y servicios" };

export default function Page() {
  return <SalonTeamView />;
}
