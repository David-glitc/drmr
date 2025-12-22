"use client";

import { useEffect, useState, useRef } from "react";

interface DashboardLoaderProps {
  isReady: boolean;
  isChecking: boolean;
}

const MIN_DISPLAY_TIME = 800; // Minimum time to show loader (ms)

export function DashboardLoader({ isReady, isChecking }: DashboardLoaderProps) {
  const [showLoader, setShowLoader] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const hasShownMinTimeRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialize start time on mount
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    // Reset start time when checking starts
    if (isChecking) {
      startTimeRef.current = Date.now();
      hasShownMinTimeRef.current = false;
      // Use setTimeout to defer state updates
      setTimeout(() => {
        setFadeOut(false);
        setShowLoader(true);
      }, 0);
      return;
    }

    // Check if minimum display time has passed
    if (startTimeRef.current === null) return;
    const elapsed = Date.now() - startTimeRef.current;
    const minTimePassed = elapsed >= MIN_DISPLAY_TIME;

    if (isReady && !isChecking) {
      if (minTimePassed || hasShownMinTimeRef.current) {
        // Start fade out animation
        setTimeout(() => {
          setFadeOut(true);
          // Hide loader after animation
          setTimeout(() => {
            setShowLoader(false);
          }, 300);
        }, 0);
      } else {
        // Wait for minimum display time
        const remainingTime = MIN_DISPLAY_TIME - elapsed;
        const timer = setTimeout(() => {
          hasShownMinTimeRef.current = true;
          setFadeOut(true);
          setTimeout(() => {
            setShowLoader(false);
          }, 300);
        }, remainingTime);
        return () => clearTimeout(timer);
      }
    } else {
      setTimeout(() => {
        setFadeOut(false);
        setShowLoader(true);
      }, 0);
    }
  }, [isReady, isChecking]);

  if (!showLoader) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0f] transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative">
          <img
            src="/logo.jpg"
            alt="DRMR Logo"
            className="h-20 w-20 rounded-2xl object-cover"
          />
          <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-pulse" />
        </div>

        {/* Loading Spinner */}
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />
          <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-r-red-500" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">DRMR Dashboard</h2>
          <p className="text-sm text-white/60 animate-pulse">
            {isChecking ? "Establishing connection..." : "Loading..."}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full bg-white/20 rounded-full transition-all duration-500 ${
              isReady ? "w-full" : "w-3/5 animate-pulse"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

