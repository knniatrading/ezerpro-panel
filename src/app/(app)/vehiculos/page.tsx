import type { Metadata } from "next";
import { TallerVehiclesView } from "@/components/taller-vehicles";

export const metadata: Metadata = { title: "Vehículos" };

export default function Page() {
  return <TallerVehiclesView />;
}
