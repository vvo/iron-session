import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/next";

import "@/app/globals.css";
import { SiteHeader } from "@/app/site-header";

import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={inter.className}>
      <div className="px-10 pt-6">
        <SiteHeader />
      </div>
      <Component {...pageProps} />
      <Analytics />
    </div>
  );
}
