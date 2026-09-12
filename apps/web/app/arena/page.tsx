import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import {
  TournamentsManager,
  type Tournament,
} from "@/components/tournaments-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Arena | MastersTCG",
  description: "Conheça os torneios de Pokémon TCG do MastersTCG.",
};

async function ArenaContent() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  let isAdmin = false;

  if (user && !authError) {
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (roleError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 text-[#071a4c] sm:px-6">
          <div
            role="alert"
            className="max-w-xl rounded-3xl border border-red-200 bg-white p-7 shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
              !
            </div>

            <h1 className="mt-5 text-xl font-black">
              Não foi possível verificar suas permissões
            </h1>

            <p className="mt-3 text-slate-600">
              Atualize a página para tentar novamente.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Voltar ao início
            </Link>
          </div>
        </main>
      );
    }

    isAdmin = Boolean(roles?.length);
  }

  let query = supabase
    .from("tournaments")
    .select(
      `
        id,
        name,
        description,
        game_slug,
        format,
        status,
        starts_at,
        registration_deadline,
        max_players,
        location,
        rules,
        prizes_description,
        created_at
      `,
    )
    .order("starts_at", { ascending: true });

  if (!isAdmin) {
    query = query.neq("status", "draft");
  }

  const { data: tournaments, error: tournamentsError } = await query;

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

          <nav
            aria-label="Navegação principal"
            className="flex max-w-full flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-slate-600"
          >
            <Link href="/collection" className="transition hover:text-blue-700">
              Minha coleção
            </Link>

            <Link href="/decks" className="transition hover:text-blue-700">
              Meus decks
            </Link>

            <Link
              href="/arena"
              aria-current="page"
              className="font-bold text-blue-700"
            >
              Arena
            </Link>

            <Link href="/ranking" className="transition hover:text-blue-700">
              Ranking
            </Link>

            <Link
              href="/marketplace"
              className="transition hover:text-blue-700"
            >
              Marketplace
            </Link>

            {isAdmin && (
              <Link
                href="/moderation"
                className="transition hover:text-blue-700"
              >
                Moderação
              </Link>
            )}

            {user && !authError ? (
              <Link href="/profile" className="transition hover:text-blue-700">
                Meu perfil
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white transition hover:bg-blue-700"
              >
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/25 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl"
          />

          <div className="relative">
            <span className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
              Arena Masters
            </span>

            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
              Seu próximo desafio começa aqui.
            </h1>

            <p className="mt-4 max-w-2xl leading-relaxed text-blue-100">
              Conheça os torneios de Pokémon TCG, confira os regulamentos e
              prepare seus decks para participar.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Torneios organizados
              </span>

              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Chaves e rodadas
              </span>

              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Ranking Masters
              </span>
            </div>

            {isAdmin && (
              <span className="mt-6 inline-flex rounded-full bg-yellow-400 px-4 py-2 text-xs font-black text-[#071a4c]">
                Acesso de administrador
              </span>
            )}
          </div>
        </div>

        <div className="mt-8">
          {tournamentsError ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
            >
              <p className="font-bold">
                Não foi possível carregar os torneios.
              </p>
              <p className="mt-2 text-sm">
                Atualize a página para tentar novamente.
              </p>
            </div>
          ) : (
            <TournamentsManager
              initialTournaments={(tournaments ?? []) as Tournament[]}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function ArenaLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/70 to-slate-50">
      <div className="rounded-2xl border border-blue-100 bg-white px-8 py-6 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

        <p role="status" className="mt-4 font-semibold text-slate-600">
          Carregando a Arena...
        </p>
      </div>
    </main>
  );
}

export default function ArenaPage() {
  return (
    <Suspense fallback={<ArenaLoading />}>
      <ArenaContent />
    </Suspense>
  );
}
