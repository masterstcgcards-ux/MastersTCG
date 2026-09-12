import Image from "next/image";
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
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 text-[#071a4c]">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-6">
          <Link href="/" aria-label="MastersTCG — início">
            <Image
              src="/masters-logo.png"
              alt="MastersTCG"
              width={260}
              height={70}
              priority
              className="h-auto w-44 sm:w-52"
            />
          </Link>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-slate-600">
            <Link href="/collection" className="transition hover:text-blue-700">
              Minha coleção
            </Link>

            <Link
              href="/marketplace"
              className="transition hover:text-blue-700"
            >
              Marketplace
            </Link>

            <Link href="/orders" className="transition hover:text-blue-700">
              Pedidos
            </Link>

            <Link href="/auctions" className="transition hover:text-blue-700">
              Leilões
            </Link>

            <Link href="/arena" className="transition hover:text-blue-700">
              Arena
            </Link>

            <Link
              href="/moderation"
              aria-current="page"
              className="font-bold text-blue-700"
            >
              Moderação
            </Link>

            <Link href="/profile" className="transition hover:text-blue-700">
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/25 blur-3xl"
          />

          <div className="relative">
            <span className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
              Administração e segurança
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
              Moderação
            </h1>

            <p className="mt-4 max-w-3xl leading-relaxed text-blue-100">
              Analise denúncias, registre providências e ajude a manter as
              negociações seguras para todos os Masters.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Acesso administrativo
              </span>

              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Proteção da comunidade
              </span>
            </div>
          </div>
        </div>

        {reportsError ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
          >
            <p className="font-bold">Não foi possível carregar as denúncias.</p>
            <p className="mt-2 text-sm">{reportsError.message}</p>
          </div>
        ) : (
          <div className="mt-8">
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
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="h-5 w-56 animate-pulse rounded bg-blue-100" />
        <div className="mt-6 h-12 w-80 animate-pulse rounded bg-blue-100" />
        <div className="mt-10 h-48 animate-pulse rounded-3xl bg-blue-100" />
        <div className="mt-6 h-96 animate-pulse rounded-3xl bg-white shadow-sm" />
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
