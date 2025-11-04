import { Inter } from "next/font/google";
import "../globals.css"
import { MenuProvider } from "../context/MenuContext";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ scrollbarWidth: "thin", overflowX: "hidden" }} className="scroll-smooth">
      <head>
        <link rel="icon" href="/images/logo-circle.png" />
      </head>
      <body className={inter.className}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-23X8HHWDER"
          strategy="afterInteractive"
        />
        <Script id="ga-gtag" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          gtag('js', new Date());
          gtag('config', 'G-23X8HHWDER');
        `}</Script>
        <div className="flex min-h-screen flex-col">
          <MenuProvider>
            {children}
          </MenuProvider>
        </div>
      </body>
    </html>
  );
}
