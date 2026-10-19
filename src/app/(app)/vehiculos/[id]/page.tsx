import type { Metadata } from "next";
import { TallerVehicleView } from "@/components/taller-vehicles";

export const metadata: Metadata = { title: "Vehículo" };

export default function Page() {
  return <TallerVehicleView />;
}
