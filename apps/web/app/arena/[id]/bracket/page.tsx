import Image from "next/image";
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
            aria-label="Navegação da chave"
            className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-slate-600"
          >
            <Link href="/collection" className="transition hover:text-blue-700">
              Minha coleção
            </Link>

            <Link href="/decks" className="transition hover:text-blue-700">
              Meus decks
            </Link>

            <Link href="/arena" className="font-bold text-blue-700">
              Arena
            </Link>

            {isAdmin && (
              <Link
                href={`/arena/${tournament.id}/registrations`}
                className="transition hover:text-blue-700"
              >
                Inscrições
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          href="/arena"
          className="inline-flex rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
        >
          ← Voltar para a Arena
        </Link>

        <div className="relative mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-12">
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

            <h1 className="mt-5 text-3xl font-black sm:text-5xl">
              Chave do torneio
            </h1>

            <p className="mt-3 break-words text-xl font-bold text-white">
              {tournament.name}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-blue-50">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Pokémon TCG
              </span>

              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Formato: {tournament.format || "Não informado"}
              </span>

              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Início: {formatDate(tournament.starts_at)}
              </span>

              {tournament.max_players && (
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                  Até {tournament.max_players} participantes
                </span>
              )}
            </div>
          </div>
        </div>

        {bracketError ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
          >
            <p className="font-bold">Não foi possível carregar a chave.</p>
            <p className="mt-2 text-sm">{bracketError.message}</p>
          </div>
        ) : (
          <div className="mt-8">
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
          </div>
        )}
      </section>
    </>
  );
}

function BracketLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/70 to-slate-50">
      <div className="rounded-2xl border border-blue-100 bg-white px-8 py-6 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

        <p className="mt-4 font-semibold text-slate-600">
          Carregando chave do torneio...
        </p>
      </div>
    </main>
  );
}

export default function BracketPage({ params }: BracketPageProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 text-[#071a4c]">
      <Suspense fallback={<BracketLoading />}>
        <BracketContent params={params} />
      </Suspense>
    </main>
  );
}
