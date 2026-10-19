import type { Metadata } from "next";
import { TallerMechanicsView } from "@/components/taller-mechanics";

export const metadata: Metadata = { title: "Mecánicos" };

export default function Page() {
  return <TallerMechanicsView />;
}
