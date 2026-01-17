import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "../providers/app-providers";

export const metadata: Metadata = {
  title: "DRMR Staking Dashboard",
  description: "Your american dream starts here.",
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
      <body className="antialiased">
        {/* Early error handler for browser extension conflicts */}
        <Script
          id="ethereum-error-handler"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent ethereum redefinition errors from browser extensions
              (function() {
                // Make ethereum property configurable to prevent conflicts
                // This runs before any extensions can lock the property
                try {
                  if (typeof window !== 'undefined' && !window.ethereum) {
                    // Define ethereum as configurable so extensions can modify it
                    Object.defineProperty(window, 'ethereum', {
                      value: undefined,
                      writable: true,
                      configurable: true,
                      enumerable: true
                    });
                  }
                } catch (e) {
                  // Ignore if already defined
                }

                // Handle errors that occur during extension injection
                window.addEventListener('error', function(event) {
                  if (event.error && event.error.message && 
                      (event.error.message.includes('Cannot redefine property: ethereum') ||
                       event.error.message.includes('ethereum') && event.error.message.includes('redefine'))) {
                    console.warn('[App] Suppressed wallet extension conflict (safe to ignore)');
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return false;
                  }
                }, true);
                
                // Handle unhandled promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  const reason = event.reason;
                  const errorMessage = reason?.message || reason?.toString() || String(reason);
                  if (errorMessage.includes('Cannot redefine property: ethereum') ||
                      (errorMessage.includes('ethereum') && errorMessage.includes('redefine'))) {
                    console.warn('[App] Suppressed wallet extension promise rejection (safe to ignore)');
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
