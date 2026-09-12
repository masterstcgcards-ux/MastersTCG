import Link from "next/link";

import { LogoutButton } from "./logout-button";
import { createClient } from "@/lib/supabase/server";

export async function AuthButton() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return user ? (
    <div className="flex max-w-full items-center gap-3">
      <span className="hidden max-w-52 truncate text-sm font-semibold text-slate-600 sm:inline">
        Olá, {String(user.email || "Master")}!
      </span>

      <LogoutButton />
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
      >
        Entrar
      </Link>

      <Link
        href="/auth/sign-up"
        className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-600"
      >
        Criar conta
      </Link>
    </div>
  );
}
