import type { Metadata } from "next";
import { ResCensusView } from "@/components/res-census";

export const metadata: Metadata = { title: "Vehículos y mascotas" };

export default function Page() {
  return <ResCensusView />;
}
