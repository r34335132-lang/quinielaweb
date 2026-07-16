import type { Metadata } from "next";
import { Outfit } from "next/font/google";

import { Providers } from "@/components/Providers";
import { Shell } from "@/components/Shell";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Quiniela Deportiva",
  description: "Predicciones fáciles: gana, empate o pierde. Sin apuestas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} antialiased`}>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
