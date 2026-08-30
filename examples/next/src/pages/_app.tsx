import type { AppProps } from "next/app";
import React, { useEffect } from "react";
import Router from "next/router";
import * as Fathom from "fathom-client";

import "@/app/globals.css";
import { SiteHeader } from "@/app/site-header";

import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

// Record a pageview when route changes
Router.events.on("routeChangeComplete", (as, routeProps) => {
  if (!routeProps.shallow) {
    Fathom.trackPageview();
  }
});

export default function MyApp({ Component, pageProps }: AppProps) {
  // Initialize Fathom when the app loads
  useEffect(() => {
    Fathom.load("YKGUEAZB");
  }, []);

  return (
    <div className={inter.className}>
      <div className="px-10 pt-6">
        <SiteHeader />
      </div>
      <Component {...pageProps} />
    </div>
  );
}
