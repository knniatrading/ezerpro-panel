import type { Metadata } from "next";
import { TripView } from "@/components/driver-public";

export const metadata: Metadata = { title: "Mi servicio", robots: { index: false } };

export default function Page() {
  return <TripView />;
}
