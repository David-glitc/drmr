"use client";

import { ReactNode } from "react";
import { Provider as JotaiProvider } from "jotai";

import { QueryProvider } from "./query-provider";
import { WalletAdapterProvider } from "./wallet-adapter-provider";
import { ErrorBoundaryHandler } from "../components/ErrorBoundaryHandler";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <JotaiProvider>
      <ErrorBoundaryHandler />
      <WalletAdapterProvider>
        <QueryProvider>{children}</QueryProvider>
      </WalletAdapterProvider>
    </JotaiProvider>
  );
}

