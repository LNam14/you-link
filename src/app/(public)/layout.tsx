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
        {children}
        <Script id="fx-loader" strategy="afterInteractive">{`
          (function(){
            try {
              var isSmallScreen = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
              if (isSmallScreen) return; // Skip on small screens to preserve scroll
              var urls = [
                'https://app.embed.im/snow.js',
                'https://app.embed.im/sparkles.js',
                'https://app.embed.im/fireworks.js',
                'https://app.embed.im/spark.js'
              ];
              urls.forEach(function(u){
                var s = document.createElement('script');
                s.src = u;
                s.defer = true;
                s.async = true;
                document.body.appendChild(s);
              });
            } catch(e) { /* noop */ }
          })();
        `}</Script>
      </body>
    </html>
  );
}
