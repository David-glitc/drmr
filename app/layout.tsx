import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "../providers/app-providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DRMR Staking Dashboard",
  description:
"Track DRMR & SOL staking performance, monthly burns, and portfolio health in one modern workspace.",  
icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Early error handler for browser extension conflicts */}
        <Script
          id="ethereum-error-handler"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Catch ethereum redefinition errors from browser extensions
              (function() {
                // Handle errors that occur during extension injection
                window.addEventListener('error', function(event) {
                  if (event.error && event.error.message && event.error.message.includes('Cannot redefine property: ethereum')) {
                    console.warn('[App] Suppressed ethereum property redefinition error (browser extension conflict)');
                    event.preventDefault();
                    return false;
                  }
                }, true);
                
                // Handle unhandled promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  const reason = event.reason;
                  const errorMessage = reason?.message || reason?.toString() || String(reason);
                  if (errorMessage.includes('Cannot redefine property: ethereum')) {
                    console.warn('[App] Suppressed ethereum property redefinition promise rejection (browser extension conflict)');
                    event.preventDefault();
                    return false;
                  }
                });
              })();
            `,
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
