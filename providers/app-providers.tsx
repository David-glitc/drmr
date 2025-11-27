"use client";

import { ReactNode } from "react";

import { QueryProvider } from "./query-provider";
import { WalletAdapterProvider } from "./wallet-adapter-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <WalletAdapterProvider>
      <QueryProvider>{children}</QueryProvider>
    </WalletAdapterProvider>
  );
}

