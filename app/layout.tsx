import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "As Aventuras de Shall",
  description: "Uma aventura 16-bit pelas ruas noturnas de Botucatu.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
