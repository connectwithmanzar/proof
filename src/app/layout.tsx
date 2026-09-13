import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/BottomNav";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reckoning",
  description:
    "Weekly body-progress photos and weight. You vs you. Private on this phone.",
  applicationName: "Reckoning",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Reckoning",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon-192.png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Reckoning" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-black text-white antialiased">
        <div
          className="app-shell mx-auto min-h-dvh w-full max-w-[480px] bg-black"
          style={{
            paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>
        <BottomNav />
        <PwaRegister />
      </body>
    </html>
  );
}
