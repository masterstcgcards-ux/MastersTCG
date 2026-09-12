import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Ranking dos Masters | MastersTCG",
  description: "Classificação dos jogadores nos torneios da Arena MastersTCG.",
};

type RankingEntry = {
  ranking_position: number;
  user_id: string;
  display_name: string;
  username: string | null;
  tournaments_played: number;
  wins: number;
  losses: number;
  titles: number;
  points: number;
};

function positionStyle(position: number) {
  if (position === 1) {
    return "border-yellow-300 bg-yellow-50 text-yellow-700";
  }

  if (position === 2) {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  if (position === 3) {
    return "border-orange-300 bg-orange-50 text-orange-700";
  }

  return "border-blue-100 bg-blue-50 text-blue-800";
}

function positionLabel(position: number) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";

  return `${position}º`;
}

async function RankingContent() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login?next=/ranking");
  }

  const { data: rankingData, error: rankingError } = await supabase.rpc(
    "get_masters_ranking",
  );

  const ranking = Array.isArray(rankingData)
    ? (rankingData as RankingEntry[])
    : [];

  const leader = ranking[0] || null;

  const totalMatches = Math.floor(
    ranking.reduce(
      (total, player) => total + Number(player.wins) + Number(player.losses),
      0,
    ) / 2,
  );

  const totalTitles = ranking.reduce(
    (total, player) => total + Number(player.titles),
    0,
  );

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
            aria-label="Navegação principal"
            className="flex max-w-full flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-slate-600"
          >
            <Link href="/collection" className="transition hover:text-blue-700">
              Minha coleção
            </Link>

            <Link href="/decks" className="transition hover:text-blue-700">
              Meus decks
            </Link>

            <Link href="/arena" className="transition hover:text-blue-700">
              Arena
            </Link>

            <Link
              href="/ranking"
              aria-current="page"
              className="font-bold text-blue-700"
            >
              Ranking
            </Link>

            <Link
              href="/marketplace"
              className="transition hover:text-blue-700"
            >
              Marketplace
            </Link>

            <Link href="/profile" className="transition hover:text-blue-700">
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-10 text-white sm:px-10 sm:py-12">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl"
            />

            <div className="relative">
              <span className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
                Arena Masters
              </span>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Ranking dos Masters
              </h1>

              <p className="mt-4 max-w-3xl leading-relaxed text-blue-100">
                Acompanhe o desempenho dos jogadores nos torneios. Cada vitória
                vale 3 pontos, cada participação vale 1 ponto e cada título
                acrescenta 5 pontos.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {rankingError ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
              >
                Não foi possível carregar o ranking: {rankingError.message}
              </div>
            ) : ranking.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/50 p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-2xl font-black text-white shadow-lg shadow-blue-200">
                  M
                </div>

                <h2 className="mt-5 text-2xl font-black text-[#071a4c]">
                  O ranking começará em breve
                </h2>

                <p className="mx-auto mt-3 max-w-xl leading-relaxed text-slate-600">
                  Os jogadores aparecerão aqui quando um torneio começar e
                  possuir participantes confirmados.
                </p>

                <Link
                  href="/arena"
                  className="mt-6 inline-flex rounded-xl bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-600"
                >
                  Ir para a Arena
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#071a4c] to-blue-700 p-5 text-white shadow-sm">
                    <div
                      aria-hidden="true"
                      className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-yellow-300/20 blur-2xl"
                    />

                    <div className="relative">
                      <p className="text-sm font-semibold text-blue-100">
                        Líder atual
                      </p>

                      <p className="mt-2 truncate text-2xl font-black">
                        {leader?.display_name}
                      </p>

                      <p className="mt-2 text-sm font-bold text-yellow-300">
                        {leader?.points} pontos
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                    <p className="text-sm font-semibold text-slate-600">
                      Masters classificados
                    </p>

                    <p className="mt-2 text-3xl font-black text-blue-800">
                      {ranking.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                    <p className="text-sm font-semibold text-slate-600">
                      Partidas concluídas
                    </p>

                    <p className="mt-2 text-3xl font-black text-blue-800">
                      {totalMatches}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                    <p className="text-sm font-semibold text-yellow-800">
                      Títulos conquistados
                    </p>

                    <p className="mt-2 text-3xl font-black text-yellow-700">
                      {totalTitles}
                    </p>
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                  <div className="border-b border-blue-100 bg-blue-50/70 px-5 py-4">
                    <h2 className="text-lg font-black text-[#071a4c]">
                      Classificação geral
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Deslize horizontalmente para visualizar todas as
                      informações.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] border-collapse">
                      <thead className="border-b border-blue-100 bg-slate-50">
                        <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          <th className="px-5 py-4">Posição</th>
                          <th className="px-5 py-4">Master</th>
                          <th className="px-5 py-4 text-center">Pontos</th>
                          <th className="px-5 py-4 text-center">Vitórias</th>
                          <th className="px-5 py-4 text-center">Derrotas</th>
                          <th className="px-5 py-4 text-center">Torneios</th>
                          <th className="px-5 py-4 text-center">Títulos</th>
                        </tr>
                      </thead>

                      <tbody>
                        {ranking.map((player) => {
                          const isCurrentUser = player.user_id === user.id;

                          return (
                            <tr
                              key={player.user_id}
                              className={`border-b border-blue-50 last:border-b-0 ${
                                isCurrentUser
                                  ? "bg-blue-50"
                                  : "transition hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex min-w-12 items-center justify-center rounded-xl border px-3 py-2 font-black ${positionStyle(
                                    Number(player.ranking_position),
                                  )}`}
                                >
                                  {positionLabel(
                                    Number(player.ranking_position),
                                  )}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-black text-blue-700">
                                    {player.display_name
                                      .trim()
                                      .charAt(0)
                                      .toUpperCase() || "M"}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate font-bold text-[#071a4c]">
                                      {player.display_name}

                                      {isCurrentUser && (
                                        <span className="ml-2 rounded-full bg-blue-700 px-2 py-1 text-xs text-white">
                                          Você
                                        </span>
                                      )}
                                    </p>

                                    {player.username && (
                                      <p className="truncate text-sm text-slate-500">
                                        @{player.username}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 text-center text-lg font-black text-blue-700">
                                {player.points}
                              </td>

                              <td className="px-5 py-4 text-center font-bold text-emerald-600">
                                {player.wins}
                              </td>

                              <td className="px-5 py-4 text-center text-slate-500">
                                {player.losses}
                              </td>

                              <td className="px-5 py-4 text-center text-slate-700">
                                {player.tournaments_played}
                              </td>

                              <td className="px-5 py-4 text-center font-bold text-yellow-600">
                                {player.titles}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function RankingLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl border border-blue-100 bg-white px-8 py-6 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />

        <p className="mt-4 font-semibold text-slate-600">
          Carregando ranking dos Masters...
        </p>
      </div>
    </div>
  );
}

export default function RankingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 text-[#071a4c]">
      <Suspense fallback={<RankingLoading />}>
        <RankingContent />
      </Suspense>
    </main>
  );
}
