import type { Metadata, Viewport } from "next";
import { Cairo, Tajawal, Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "واصل مصر — Wasel Egypt | منصة النقل الذكية المتعددة",
  description:
    "منصة واصل مصر للنقل العام الذكي: تخطيط رحلات متعدد الوسائط عبر مترو القاهرة الكبرى، القطار الكهربائي الخفيف LRT، المونوريل، حافلات BRT والسكك الحديدية الوطنية — أوقات حية، أجرة رسمية، وتنبيهات لحظية.",
  keywords: ["واصل مصر", "مترو القاهرة", "LRT", "مونوريل", "BRT", "النقل الذكي", "Wasel Egypt"],
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%23202020'/%3E%3Cpath d='M8 21c4 0 4-10 8-10s4 10 8 10' stroke='%236647f0' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3Ccircle cx='8' cy='21' r='2.4' fill='%230091ff'/%3E%3Ccircle cx='24' cy='21' r='2.4' fill='%23ffffff'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  themeColor: "#202020",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var clean = function() {
                    var els = document.querySelectorAll('[bis_skin_checked]');
                    for (var i = 0; i < els.length; i++) {
                      els[i].removeAttribute('bis_skin_checked');
                    }
                  };
                  clean();
                  if (typeof MutationObserver !== 'undefined') {
                    var observer = new MutationObserver(function(mutations) {
                      for (var i = 0; i < mutations.length; i++) {
                        var m = mutations[i];
                        if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                          m.target.removeAttribute('bis_skin_checked');
                        }
                      }
                    });
                    if (document.documentElement) {
                      observer.observe(document.documentElement, {
                        attributes: true,
                        attributeFilter: ['bis_skin_checked'],
                        subtree: true
                      });
                    }
                  }
                  window.addEventListener('DOMContentLoaded', clean);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${cairo.variable} ${tajawal.variable} ${jakarta.variable} ${inter.variable} ${jetbrains.variable} antialiased bg-white text-ink`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
