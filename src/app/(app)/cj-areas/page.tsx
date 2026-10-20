import type { Metadata } from "next";
import { ResAreasView } from "@/components/res-areas";

export const metadata: Metadata = { title: "Áreas comunes" };

export default function Page() {
  return <ResAreasView />;
}
