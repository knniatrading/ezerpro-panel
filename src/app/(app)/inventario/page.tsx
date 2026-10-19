import type { Metadata } from "next";
import { FerreInventoryView } from "@/components/ferre-inventory";

export const metadata: Metadata = { title: "Inventario" };

export default function Page() {
  return <FerreInventoryView />;
}
