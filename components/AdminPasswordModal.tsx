"use client";

import { useState, useEffect, useRef } from "react";

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onVerifyPassword: (password: string) => Promise<boolean>;
}

export function AdminPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  onVerifyPassword,
}: AdminPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError("");

    try {
      if (!onVerifyPassword || typeof onVerifyPassword !== 'function') {
        throw new Error("Password verification function is not available");
      }
      const isValid = await onVerifyPassword(password);
      if (isValid) {
        setError("");
        onSuccess();
        setPassword("");
        onClose();
      } else {
        setError("Incorrect password");
        setPassword("");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to verify password. Please try again.";
      
      // Check for specific error messages
      if (errorMessage.includes("Admin authentication is not configured")) {
        setError("Admin password is not configured. Please set ADMIN_PASSWORD in your .env.local file.");
      } else if (errorMessage.includes("HTTP 500")) {
        setError("Server error. Please check if ADMIN_PASSWORD is set in your environment variables.");
      } else if (errorMessage.includes("HTTP 401")) {
        setError("Incorrect password");
      } else {
        setError(errorMessage || "Failed to verify password. Please try again.");
      }
      setPassword("");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-4">Admin Access</h2>
        <p className="text-sm text-white/70 mb-4">Enter the admin password to access the admin panel.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-2 block">Password</label>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              placeholder="Enter password"
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-400 mt-2">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? "Verifying..." : "Access"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
