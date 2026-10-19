import type { Metadata } from "next";
import { FerreCatalogView } from "@/components/ferre-public";

export const metadata: Metadata = { title: "Catálogo" };

export default function Page() {
  return <FerreCatalogView />;
}
