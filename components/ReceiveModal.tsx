"use client";

import { useState, useCallback, useEffect } from "react";

// Lazy load QRCode component to avoid SSR issues
let QRCodeComponent: any = null;
const loadQRCode = async () => {
  if (typeof window !== "undefined" && !QRCodeComponent) {
    const QRCodeModule = await import("react-qr-code");
    QRCodeComponent = QRCodeModule.default || QRCodeModule;
  }
  return QRCodeComponent;
};

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  tokenSymbol?: string;
  tokenMint?: string;
}

export function ReceiveModal({
  isOpen,
  onClose,
  walletAddress,
  tokenSymbol = "SOL",
  tokenMint,
}: ReceiveModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedToken, setSelectedToken] = useState<"SOL" | "TOKEN">("SOL");
  const [mounted, setMounted] = useState(false);
  const [QRCode, setQRCode] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // Load QRCode component on mount
    loadQRCode().then((component) => {
      if (component) {
        setQRCode(() => component);
      }
    });
  }, []);

  // Generate QR code data - for tokens, include the token mint address
  const qrData = selectedToken === "SOL" 
    ? walletAddress
    : tokenMint 
    ? `${walletAddress}?token=${tokenMint}`
    : walletAddress;

  const displayAddress = walletAddress;

  const copyAddress = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = displayAddress;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
      document.body.removeChild(textArea);
    }
  }, [displayAddress]);

  useEffect(() => {
    if (isOpen) {
      console.log("[ReceiveModal] Modal opened with address:", walletAddress);
    }
  }, [isOpen, walletAddress]);

  if (!isOpen || !mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6 z-[101]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Header */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-white">Receive SOL and SPL Tokens</h2>
            <p className="mt-2 text-sm text-white/60">
              Scan the QR code or copy the address below
            </p>
          </div>

          {/* Token Selector */}
          <div className="mb-6 flex gap-2 rounded-xl bg-white/5 p-1">
            <button
              onClick={() => setSelectedToken("SOL")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                selectedToken === "SOL"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-white/60 hover:text-white"
              }`}
            >
              SOL
            </button>
            {tokenMint && (
              <button
                onClick={() => setSelectedToken("TOKEN")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedToken === "TOKEN"
                    ? "bg-red-500/20 text-red-400"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {tokenSymbol}
              </button>
            )}
          </div>

          {/* QR Code */}
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-white p-4 flex items-center justify-center min-w-[240px] min-h-[240px]">
              {mounted && QRCode && qrData ? (
                <QRCode
                  value={qrData}
                  size={240}
                  level="H"
                  fgColor="#000000"
                  bgColor="#ffffff"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              ) : (
                <div className="w-[240px] h-[240px] flex items-center justify-center text-gray-400">
                  {mounted ? "Loading QR code..." : "Initializing..."}
                </div>
              )}
            </div>
          </div>

          {/* Address Display */}
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-2 text-xs font-medium text-white/60">Your Address</p>
            <p className="break-all font-mono text-sm text-white">
              {displayAddress}
            </p>
          </div>

          {/* Copy Button */}
          <button
            onClick={copyAddress}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10 active:scale-95"
          >
            {copied ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Address
              </span>
            )}
          </button>

          {/* Warning */}
          <p className="mt-4 text-center text-xs text-white/40">
            Send SOL and SPL tokens to this address
          </p>
        </div>
      </div>
    </>
  );
}

