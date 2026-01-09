"use client";

import { useEffect } from "react";

/**
 * ErrorBoundaryHandler - Handles global errors that occur during initialization
 * Specifically handles:
 * - "Cannot redefine property: ethereum" error from browser extensions
 * - Duplicate key warnings from wallet adapters (MetaMask detected twice)
 */
export function ErrorBoundaryHandler() {
  // Suppress React's duplicate key console errors for wallet adapters
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Filter out specific React warnings about duplicate keys for MetaMask
    const shouldSuppress = (args: unknown[]): boolean => {
      const message = args.map(arg => String(arg)).join(' ');
      // Suppress MetaMask duplicate key warnings from wallet adapter
      if (message.includes('same key') && message.includes('MetaMask')) {
        return true;
      }
      // Suppress other wallet-related duplicate key warnings
      if (message.includes('Encountered two children with the same key') && 
          (message.includes('Wallet') || message.includes('wallet'))) {
        return true;
      }
      return false;
    };
    
    console.error = (...args: unknown[]) => {
      if (!shouldSuppress(args)) {
        originalError.apply(console, args);
      }
    };
    
    console.warn = (...args: unknown[]) => {
      if (!shouldSuppress(args)) {
        originalWarn.apply(console, args);
      }
    };
    
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
  
  useEffect(() => {
    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      // Check if this is the ethereum redefinition error
      if (
        event.error?.message?.includes("Cannot redefine property: ethereum") ||
        event.message?.includes("Cannot redefine property: ethereum")
      ) {
        // Suppress this error - it's caused by browser extensions and doesn't affect the app
        console.warn(
          "[ErrorBoundaryHandler] Suppressed ethereum property redefinition error (likely from browser extension)"
        );
        event.preventDefault();
        return false;
      }
      
      // Also suppress MetaMask duplicate key errors
      if (
        event.message?.includes("same key") && 
        event.message?.includes("MetaMask")
      ) {
        event.preventDefault();
        return false;
      }
    };

    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const errorMessage =
        reason?.message || reason?.toString() || String(reason);

      if (errorMessage.includes("Cannot redefine property: ethereum")) {
        // Suppress this error
        console.warn(
          "[ErrorBoundaryHandler] Suppressed ethereum property redefinition promise rejection (likely from browser extension)"
        );
        event.preventDefault();
        return false;
      }
    };

    // Add event listeners
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    // Cleanup
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // Also try to prevent the error by checking if ethereum is already defined
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if window.ethereum already exists and has a descriptor
      const ethereumDescriptor = Object.getOwnPropertyDescriptor(window, "ethereum");
      
      if (ethereumDescriptor && !ethereumDescriptor.configurable) {
        // If ethereum is already defined and not configurable, we can't redefine it
        // This is expected behavior - just log a warning
        console.warn(
          "[ErrorBoundaryHandler] window.ethereum is already defined and not configurable (likely from browser extension)"
        );
      }
    }
  }, []);

  return null;
}
