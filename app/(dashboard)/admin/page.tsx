"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect old admin page to unified admin panel
export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/staking-admin");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
        <p className="text-white/70">Redirecting to Admin Panel...</p>
      </div>
    </div>
  );
}
