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
        <main className="flex min-h-screen items-center justify-center bg-[#09090f] px-6 text-white">
          <div
            role="alert"
            className="max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6"
          >
            <h1 className="text-xl font-bold">
              Não foi possível verificar suas permissões
            </h1>

            <p className="mt-3 text-zinc-300">
              Atualize a página para tentar novamente.
            </p>

            <Link
              href="/"
              className="mt-5 inline-block text-violet-300 hover:text-violet-200"
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
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-5">
          <Link
            href="/"
            aria-label="MastersTCG — início"
            className="text-2xl font-black tracking-tight"
          >
            MASTERS<span className="text-violet-400">TCG</span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="flex flex-wrap items-center gap-5 text-sm text-zinc-400"
          >
            <Link href="/collection" className="hover:text-white">
              Minha coleção
            </Link>

            <Link href="/decks" className="hover:text-white">
              Meus decks
            </Link>

            <Link
              href="/arena"
              aria-current="page"
              className="font-semibold text-white"
            >
              Arena
            </Link>
            <Link href="/ranking" className="hover:text-white">
              Ranking
            </Link>
            <Link href="/marketplace" className="hover:text-white">
              Marketplace
            </Link>

            {user && !authError ? (
              <Link href="/profile" className="hover:text-white">
                Meu perfil
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500"
              >
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
            Arena Masters
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Seu próximo desafio começa aqui.
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Conheça os torneios de Pokémon TCG, confira os regulamentos e
            prepare seus decks para participar.
          </p>

          {isAdmin && (
            <span className="mt-5 inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-300">
              Acesso de administrador
            </span>
          )}
        </div>

        {tournamentsError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200"
          >
            Não foi possível carregar os torneios. Atualize a página para tentar
            novamente.
          </div>
        ) : (
          <TournamentsManager
            initialTournaments={(tournaments ?? []) as Tournament[]}
            isAdmin={isAdmin}
          />
        )}
      </section>
    </main>
  );
}

function ArenaLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p role="status" className="text-zinc-400">
        Carregando a Arena...
      </p>
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
