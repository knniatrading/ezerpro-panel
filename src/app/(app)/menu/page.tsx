import type { Metadata } from "next";
import { MenuView } from "@/components/menu-view";

export const metadata: Metadata = { title: "Menú" };

export default function MenuPage() {
  return <MenuView />;
}
