import type { Metadata } from "next";
import { ResetView } from "@/components/recover-views";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function Page() {
  return <ResetView />;
}
