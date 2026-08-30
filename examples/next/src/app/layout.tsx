import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Fathom from "./fathom";
import { SiteHeader } from "./site-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "🛠 iron-session examples",
  description: "Set of examples for iron-session",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Fathom />
        <div className="px-10 pt-6">
          <SiteHeader />
        </div>
        {children}
      </body>
    </html>
  );
}
