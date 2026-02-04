import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import "@/lib/env"; // Validate environment variables at startup

export const metadata: Metadata = {
  title: "জাদুপাথ টিচার পোর্টাল - শিক্ষকদের জন্য",
  description: "বাংলাদেশের শিক্ষকদের জন্য ডিজিটাল ক্লাসরুম পোর্টাল",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "জাদুপাথ টিচার",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#cf278d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <head>
        <script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" async></script>
      </head>
      <body className="antialiased pb-20">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
