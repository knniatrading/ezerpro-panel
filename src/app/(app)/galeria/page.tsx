import type { Metadata } from "next";
import { TechGalleryView } from "@/components/tech-gallery";

export const metadata: Metadata = { title: "Galería" };

export default function Page() {
  return <TechGalleryView />;
}
