"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const logout = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      router.push("/auth/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={isLoading}
      className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? "Saindo..." : "Sair"}
    </button>
  );
}
