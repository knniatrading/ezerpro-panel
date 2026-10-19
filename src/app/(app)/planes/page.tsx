import type { Metadata } from "next";
import { GymPlansView } from "@/components/gym-plans";

export const metadata: Metadata = { title: "Planes" };

export default function Page() {
  return <GymPlansView />;
}
