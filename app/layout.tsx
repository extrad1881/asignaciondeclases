import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asignación de clases",
  description: "Sistema de coordinación académica para asignación de clases y horarios."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
