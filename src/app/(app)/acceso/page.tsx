import type { Metadata } from "next";
import { GymAccessView } from "@/components/gym-access";

export const metadata: Metadata = { title: "Acceso" };

export default function Page() {
  return <GymAccessView />;
}
