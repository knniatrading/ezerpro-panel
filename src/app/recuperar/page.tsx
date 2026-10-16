import type { Metadata } from "next";
import { ForgotView } from "@/components/recover-views";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function Page() {
  return <ForgotView />;
}
