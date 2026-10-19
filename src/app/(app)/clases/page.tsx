import type { Metadata } from "next";
import { GymClassesView } from "@/components/gym-classes";

export const metadata: Metadata = { title: "Clases" };

export default function Page() {
  return <GymClassesView />;
}
