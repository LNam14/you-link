import { Inter } from "next/font/google";
import "../globals.css"
import { MenuProvider } from "../context/MenuContext";

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
        <div className="flex min-h-screen flex-col">
          <MenuProvider>
            {children}
          </MenuProvider>
        </div>
      </body>
    </html>
  );
}
