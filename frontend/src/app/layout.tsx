import type { Metadata } from "next";
import {
  Inter,
  JetBrains_Mono,
  Cormorant_Garamond,
  Libre_Baskerville,
  Outfit,
  DM_Sans,
  Syne,
  Lexend,
  Fraunces,
  Source_Serif_4,
} from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

// Design 2: Warm Ledger
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-baskerville",
  display: "swap",
});

// Design 3: Arctic Glass
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-outfit",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Design 4: Neon Dusk
const syne = Syne({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-syne",
  display: "swap",
});
const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-lexend",
  display: "swap",
});

// Design 5: Paper Light
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-fraunces",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ledgr",
  description: "Local personal finance dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${cormorant.variable} ${libreBaskerville.variable} ${outfit.variable} ${dmSans.variable} ${syne.variable} ${lexend.variable} ${fraunces.variable} ${sourceSerif.variable} bg-bg text-white antialiased`}
      >
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
