import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import {
  TournamentBracket,
  type TournamentBracketMatch,
} from "@/components/tournament-bracket";
import { createClient } from "@/lib/supabase/server";

type BracketPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Tournament = {
  id: string;
  name: string;
  game_slug: string;
  format: string | null;
  status: string;
  starts_at: string;
  max_players: number | null;
};

type BracketMatch = {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  player_one_registration_id: string;
  player_two_registration_id: string | null;
  winner_registration_id: string | null;
  player_one_score: number | null;
  player_two_score: number | null;
  status: string;
  scheduled_at: string | null;
  player_one_name: string;
  player_one_username: string | null;
  player_two_name: string | null;
  player_two_username: string | null;
  winner_name: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

async function BracketContent({ params }: BracketPageProps) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        `/arena/${tournamentId}/bracket`,
      )}`,
    );
  }

  const [{ data: roleData }, { data: tournamentData, error: tournamentError }] =
    await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle(),
      supabase
        .from("tournaments")
        .select("id, name, game_slug, format, status, starts_at, max_players")
        .eq("id", tournamentId)
        .maybeSingle(),
    ]);

  if (tournamentError || !tournamentData) {
    notFound();
  }

  const tournament = tournamentData as Tournament;
  const isAdmin = roleData?.role === "admin";

  const { data: bracketData, error: bracketError } = await supabase.rpc(
    "get_tournament_bracket",
    {
      p_tournament_id: tournamentId,
    },
  );

  let confirmedRegistrationsCount = 0;

  if (isAdmin) {
    const { data: registrationsData } = await supabase.rpc(
      "get_tournament_registrations",
      {
        p_tournament_id: tournamentId,
      },
    );

    confirmedRegistrationsCount = Array.isArray(registrationsData)
      ? registrationsData.filter(
          (registration) => registration.status === "confirmed",
        ).length
      : 0;
  }

  return (
    <>
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
            aria-label="Navegação da chave"
            className="flex flex-wrap items-center gap-4 text-sm"
          >
            <Link
              href="/collection"
              className="text-zinc-400 transition hover:text-white"
            >
              Minha coleção
            </Link>

            <Link
              href="/decks"
              className="text-zinc-400 transition hover:text-white"
            >
              Meus decks
            </Link>

            <Link
              href="/arena"
              className="font-semibold text-violet-300 transition hover:text-violet-200"
            >
              Arena
            </Link>

            {isAdmin && (
              <Link
                href={`/arena/${tournament.id}/registrations`}
                className="text-zinc-400 transition hover:text-white"
              >
                Inscrições
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/arena"
          className="text-sm font-semibold text-violet-300 hover:text-violet-200"
        >
          ← Voltar para a Arena
        </Link>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
            Arena Masters
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Chave do torneio
          </h1>

          <p className="mt-3 text-xl font-bold text-zinc-200">
            {tournament.name}
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              Pokémon TCG
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              Formato: {tournament.format || "Não informado"}
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              Início: {formatDate(tournament.starts_at)}
            </span>

            {tournament.max_players && (
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Até {tournament.max_players} participantes
              </span>
            )}
          </div>
        </div>

        {bracketError ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200"
          >
            Não foi possível carregar a chave: {bracketError.message}
          </div>
        ) : (
          <TournamentBracket
            tournamentId={tournament.id}
            initialTournamentStatus={tournament.status}
            initialMatches={
              Array.isArray(bracketData)
                ? (bracketData as TournamentBracketMatch[])
                : []
            }
            confirmedRegistrationsCount={confirmedRegistrationsCount}
            isAdmin={isAdmin}
          />
        )}
      </section>
    </>
  );
}

function BracketLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p className="text-zinc-400">Carregando chave do torneio...</p>
    </main>
  );
}

export default function BracketPage({ params }: BracketPageProps) {
  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <Suspense fallback={<BracketLoading />}>
        <BracketContent params={params} />
      </Suspense>
    </main>
  );
}
