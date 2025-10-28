import { Inter } from "next/font/google";
import "../globals.css";
import Script from "next/script";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    template: '%s | You Link',
    default: 'You Link - Giải pháp SEO toàn diện',
  },
  description: 'You Link cung cấp giải pháp SEO toàn diện cho doanh nghiệp của bạn',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
        <body className={inter.className}>{children}
        <Script src="https://app.embed.im/snow.js" defer></Script>
        <Script src="https://app.embed.im/sparkles.js" defer></Script>
        <Script src="https://app.embed.im/fireworks.js" defer></Script>
        <Script src="https://app.embed.im/spark.js" defer></Script>
      </body>
    </html>
  );
}
