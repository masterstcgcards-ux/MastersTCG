import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  ReportsManager,
  type MarketplaceReport,
} from "@/components/reports-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Moderação | MastersTCG",
  description: "Painel administrativo de segurança e denúncias.",
};

export const instant = false;

async function ModerationContent() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleData) {
    redirect("/marketplace");
  }

  const { data: reportsData, error: reportsError } = await supabase.rpc(
    "get_marketplace_reports",
    {
      p_scope: "admin",
    },
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-4">
          <Link
            href="/"
            aria-label="MastersTCG — início"
            className="text-xl font-black tracking-tight"
          >
            MASTERS<span className="text-violet-400">TCG</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm text-zinc-400">
            <Link href="/collection" className="hover:text-white">
              Minha coleção
            </Link>

            <Link href="/marketplace" className="hover:text-white">
              Marketplace
            </Link>

            <Link href="/orders" className="hover:text-white">
              Pedidos
            </Link>

            <Link href="/auctions" className="hover:text-white">
              Leilões
            </Link>

            <Link href="/arena" className="hover:text-white">
              Arena
            </Link>

            <Link
              href="/moderation"
              aria-current="page"
              className="font-semibold text-white"
            >
              Moderação
            </Link>

            <Link href="/profile" className="hover:text-white">
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-400">
          Administração e segurança
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Moderação
        </h1>

        <p className="mt-4 max-w-3xl text-zinc-400">
          Analise denúncias, registre providências e ajude a manter as
          negociações seguras para todos os Masters.
        </p>

        {reportsError ? (
          <div className="mt-10 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Não foi possível carregar as denúncias: {reportsError.message}
          </div>
        ) : (
          <div className="mt-10">
            <ReportsManager
              initialReports={(reportsData || []) as MarketplaceReport[]}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function LoadingModeration() {
  return (
    <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="h-5 w-56 animate-pulse rounded bg-white/10" />
        <div className="mt-6 h-12 w-80 animate-pulse rounded bg-white/10" />
        <div className="mt-10 h-48 animate-pulse rounded-2xl bg-white/5" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-white/5" />
      </div>
    </main>
  );
}

export default function ModerationPage() {
  return (
    <Suspense fallback={<LoadingModeration />}>
      <ModerationContent />
    </Suspense>
  );
}
