import type { Metadata } from "next";
import { TallerPartsView } from "@/components/taller-parts";

export const metadata: Metadata = { title: "Repuestos" };

export default function Page() {
  return <TallerPartsView />;
}
