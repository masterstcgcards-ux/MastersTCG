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
    return "border-yellow-400/40 bg-yellow-400/10 text-yellow-200";
  }

  if (position === 2) {
    return "border-zinc-300/30 bg-zinc-300/10 text-zinc-200";
  }

  if (position === 3) {
    return "border-orange-400/30 bg-orange-400/10 text-orange-200";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
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
              className="text-zinc-400 transition hover:text-white"
            >
              Arena
            </Link>

            <Link href="/ranking" className="font-semibold text-violet-300">
              Ranking
            </Link>

            <Link
              href="/profile"
              className="text-zinc-400 transition hover:text-white"
            >
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
          Arena Masters
        </p>

        <h1 className="mt-3 text-3xl font-black sm:text-5xl">
          Ranking dos Masters
        </h1>

        <p className="mt-4 max-w-3xl text-zinc-400">
          Acompanhe o desempenho dos jogadores nos torneios. Cada vitória vale 3
          pontos, cada participação vale 1 ponto e cada título acrescenta 5
          pontos.
        </p>

        {rankingError ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200"
          >
            Não foi possível carregar o ranking: {rankingError.message}
          </div>
        ) : ranking.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 text-2xl font-black text-violet-300">
              M
            </div>

            <h2 className="mt-5 text-2xl font-black">
              O ranking começará em breve
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-zinc-400">
              Os jogadores aparecerão aqui quando um torneio começar e possuir
              participantes confirmados.
            </p>

            <Link
              href="/arena"
              className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500"
            >
              Ir para a Arena
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5">
                <p className="text-sm text-violet-200">Líder atual</p>
                <p className="mt-2 truncate text-2xl font-black">
                  {leader?.display_name}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#13131d] p-5">
                <p className="text-sm text-zinc-400">Masters classificados</p>
                <p className="mt-2 text-2xl font-black">{ranking.length}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#13131d] p-5">
                <p className="text-sm text-zinc-400">Partidas concluídas</p>
                <p className="mt-2 text-2xl font-black">{totalMatches}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#13131d] p-5">
                <p className="text-sm text-zinc-400">Títulos conquistados</p>
                <p className="mt-2 text-2xl font-black">{totalTitles}</p>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#11111b]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse">
                  <thead className="border-b border-white/10 bg-white/[0.03]">
                    <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
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
                          className={`border-b border-white/5 last:border-b-0 ${
                            isCurrentUser
                              ? "bg-violet-500/10"
                              : "hover:bg-white/[0.02]"
                          }`}
                        >
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex min-w-12 items-center justify-center rounded-xl border px-3 py-2 font-black ${positionStyle(
                                Number(player.ranking_position),
                              )}`}
                            >
                              {positionLabel(Number(player.ranking_position))}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 font-black text-violet-300">
                                {player.display_name
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase() || "M"}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-bold">
                                  {player.display_name}
                                  {isCurrentUser && (
                                    <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-1 text-xs text-violet-200">
                                      Você
                                    </span>
                                  )}
                                </p>

                                {player.username && (
                                  <p className="truncate text-sm text-zinc-500">
                                    @{player.username}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center text-lg font-black text-violet-300">
                            {player.points}
                          </td>

                          <td className="px-5 py-4 text-center font-semibold text-green-300">
                            {player.wins}
                          </td>

                          <td className="px-5 py-4 text-center text-zinc-400">
                            {player.losses}
                          </td>

                          <td className="px-5 py-4 text-center text-zinc-300">
                            {player.tournaments_played}
                          </td>

                          <td className="px-5 py-4 text-center font-semibold text-yellow-300">
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
      </section>
    </>
  );
}

function RankingLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p className="text-zinc-400">Carregando ranking dos Masters...</p>
    </div>
  );
}

export default function RankingPage() {
  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <Suspense fallback={<RankingLoading />}>
        <RankingContent />
      </Suspense>
    </main>
  );
}
