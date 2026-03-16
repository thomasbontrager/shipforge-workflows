import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shipforge",
  description: "Launch your SaaS faster with Shipforge.",
};

/**
 * Root layout.
 *
 * Google Analytics:
 * - The tracking ID is read from the NEXT_PUBLIC_GA_ID environment variable.
 *   Set it in .env.local (or your deployment environment) to enable tracking.
 *   Omitting the variable disables Analytics entirely rather than erroring.
 * - The <Script> components use strategy="afterInteractive" so they are
 *   injected after hydration, outside of the <head> element.  Next.js
 *   requires next/script tags to be placed in the <body> (or at the layout
 *   level) — placing them inside a custom <head> or <Head> component is not
 *   supported and triggers a warning.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <body>
        {children}

        {/* Load Google Analytics only when the tracking ID is configured. */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
