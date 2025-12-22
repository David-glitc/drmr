"use client";

interface LoadingOverlayProps {
  message?: string;
  show?: boolean;
}

export function LoadingOverlay({ message = "Loading...", show = true }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="rounded-2xl border border-white/10 bg-[#111118] p-8">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-sky-500/20 border-t-sky-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin [animation-duration:0.5s]"></div>
            </div>
          </div>
          
          {/* Message */}
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{message}</p>
            <p className="mt-2 text-sm text-slate-400">Please wait...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

