"use client";

import { ReactNode } from "react";
import { Provider as JotaiProvider } from "jotai";

import { QueryProvider } from "./query-provider";
import { WalletAdapterProvider } from "./wallet-adapter-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <JotaiProvider>
    <WalletAdapterProvider>
      <QueryProvider>{children}</QueryProvider>
    </WalletAdapterProvider>
    </JotaiProvider>
  );
}

