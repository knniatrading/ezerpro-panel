import type { Metadata } from "next";
import { ResUnitsView } from "@/components/res-units";

export const metadata: Metadata = { title: "Unidades y propietarios" };

export default function Page() {
  return <ResUnitsView />;
}
