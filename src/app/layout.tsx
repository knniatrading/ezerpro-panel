import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "./globals.css";
import { SessionProvider } from "@/components/session";

export const metadata: Metadata = {
  title: { default: "EzerPro", template: "%s | EzerPro" },
  description: "Panel de administración de EzerPro",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
