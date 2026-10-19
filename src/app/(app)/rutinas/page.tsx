import type { Metadata } from "next";
import { GymRoutinesView } from "@/components/gym-routines";

export const metadata: Metadata = { title: "Rutinas" };

export default function Page() {
  return <GymRoutinesView />;
}
