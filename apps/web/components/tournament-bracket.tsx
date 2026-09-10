"use client";

import { useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type TournamentBracketMatch = {
  match_id: string;
  round_number: number;
  match_number: number;
  match_status: string;
  player_one_registration_id: string;
  player_one_name: string;
  player_one_username: string | null;
  player_one_score: number | null;
  player_two_registration_id: string | null;
  player_two_name: string | null;
  player_two_username: string | null;
  player_two_score: number | null;
  winner_registration_id: string | null;
  scheduled_at: string | null;
};

type TournamentBracketProps = {
  tournamentId: string;
  initialTournamentStatus: string;
  initialMatches: TournamentBracketMatch[];
  confirmedRegistrationsCount: number;
  isAdmin: boolean;
};

const roundNames: Record<number, string> = {
  1: "1ª rodada",
  2: "2ª rodada",
  3: "3ª rodada",
  4: "4ª rodada",
  5: "5ª rodada",
  6: "6ª rodada",
};

function getRoundName(roundNumber: number, totalRounds: number) {
  return (
    roundNames[roundNumber] ||
    `${roundNumber}ª rodada de ${Math.max(roundNumber, totalRounds)}`
  );
}

export function TournamentBracket({
  tournamentId,
  initialTournamentStatus,
  initialMatches,
  confirmedRegistrationsCount,
  isAdmin,
}: TournamentBracketProps) {
  const submitting = useRef(false);

  const [matches, setMatches] = useState(initialMatches);
  const [tournamentStatus, setTournamentStatus] = useState(
    initialTournamentStatus,
  );
  const [scores, setScores] = useState<
    Record<string, { playerOne: string; playerTwo: string }>
  >({});
  const [generating, setGenerating] = useState(false);
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const rounds = useMemo(() => {
    const grouped = new Map<number, TournamentBracketMatch[]>();

    matches.forEach((match) => {
      const current = grouped.get(match.round_number) || [];
      current.push(match);
      grouped.set(match.round_number, current);
    });

    return Array.from(grouped.entries())
      .sort(([roundA], [roundB]) => roundA - roundB)
      .map(([roundNumber, roundMatches]) => ({
        roundNumber,
        matches: [...roundMatches].sort(
          (matchA, matchB) => matchA.match_number - matchB.match_number,
        ),
      }));
  }, [matches]);

  const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  const latestRoundFinished =
    latestRound !== null &&
    latestRound.matches.every((match) =>
      ["completed", "bye"].includes(match.match_status),
    );

  const canGenerateRound =
    isAdmin &&
    ["published", "in_progress"].includes(tournamentStatus) &&
    (matches.length === 0
      ? confirmedRegistrationsCount >= 2
      : latestRoundFinished);

  const championMatch =
    tournamentStatus === "completed" && latestRound
      ? latestRound.matches.find((match) => match.winner_registration_id)
      : null;

  function getWinnerName(match: TournamentBracketMatch) {
    if (match.winner_registration_id === match.player_one_registration_id) {
      return match.player_one_name;
    }

    if (match.winner_registration_id === match.player_two_registration_id) {
      return match.player_two_name;
    }

    return null;
  }

  async function refreshBracket() {
    const supabase = createClient();

    const [
      { data: bracketData, error: bracketError },
      { data: tournamentData, error: tournamentError },
    ] = await Promise.all([
      supabase.rpc("get_tournament_bracket", {
        p_tournament_id: tournamentId,
      }),

      supabase
        .from("tournaments")
        .select("status")
        .eq("id", tournamentId)
        .maybeSingle(),
    ]);

    if (bracketError) {
      throw new Error(bracketError.message);
    }

    if (tournamentError || !tournamentData) {
      throw new Error("Não foi possível atualizar o status do torneio.");
    }

    setMatches((bracketData ?? []) as TournamentBracketMatch[]);
    setTournamentStatus(tournamentData.status);
  }

  async function generateRound() {
    if (!canGenerateRound || submitting.current) {
      return;
    }

    submitting.current = true;
    setGenerating(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const { data: generatedRound, error: generateError } = await supabase.rpc(
        "generate_next_tournament_round",
        {
          p_tournament_id: tournamentId,
        },
      );

      if (generateError) {
        throw new Error(generateError.message);
      }

      await refreshBracket();

      setMessage(
        typeof generatedRound === "number"
          ? `Rodada ${generatedRound} processada com sucesso.`
          : "Chave atualizada com sucesso.",
      );
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Não foi possível gerar a rodada.",
      );
    } finally {
      submitting.current = false;
      setGenerating(false);
    }
  }

  async function recordResult(match: TournamentBracketMatch) {
    if (
      !isAdmin ||
      submitting.current ||
      match.match_status === "completed" ||
      match.match_status === "bye"
    ) {
      return;
    }

    const matchScores = scores[match.match_id];
    const playerOneScore = Number(matchScores?.playerOne);
    const playerTwoScore = Number(matchScores?.playerTwo);

    if (
      !Number.isInteger(playerOneScore) ||
      !Number.isInteger(playerTwoScore) ||
      playerOneScore < 0 ||
      playerTwoScore < 0
    ) {
      setError("Informe placares inteiros e maiores ou iguais a zero.");
      return;
    }

    if (playerOneScore === playerTwoScore) {
      setError("O confronto eliminatório precisa ter um vencedor.");
      return;
    }

    submitting.current = true;
    setUpdatingMatchId(match.match_id);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const { error: resultError } = await supabase.rpc(
        "record_tournament_match_result",
        {
          p_match_id: match.match_id,
          p_player_one_score: playerOneScore,
          p_player_two_score: playerTwoScore,
        },
      );

      if (resultError) {
        throw new Error(resultError.message);
      }

      await refreshBracket();

      setScores((current) => {
        const updated = { ...current };
        delete updated[match.match_id];
        return updated;
      });

      setMessage("Resultado registrado com sucesso.");
    } catch (resultError) {
      setError(
        resultError instanceof Error
          ? resultError.message
          : "Não foi possível registrar o resultado.",
      );
    } finally {
      submitting.current = false;
      setUpdatingMatchId(null);
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#11111b] p-5">
          <p className="text-sm text-zinc-400">Inscrições confirmadas</p>
          <p className="mt-2 text-3xl font-black">
            {confirmedRegistrationsCount}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#11111b] p-5">
          <p className="text-sm text-zinc-400">Rodadas geradas</p>
          <p className="mt-2 text-3xl font-black">{rounds.length}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#11111b] p-5">
          <p className="text-sm text-zinc-400">Status</p>
          <p className="mt-2 text-lg font-black text-violet-300">
            {tournamentStatus === "published"
              ? "Aguardando início"
              : tournamentStatus === "in_progress"
                ? "Em andamento"
                : tournamentStatus === "completed"
                  ? "Encerrado"
                  : tournamentStatus === "cancelled"
                    ? "Cancelado"
                    : tournamentStatus}
          </p>
        </div>
      </div>

      {championMatch && getWinnerName(championMatch) && (
        <section className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
            Campeão
          </p>

          <h2 className="mt-3 text-3xl font-black text-yellow-100">
            🏆 {getWinnerName(championMatch)}
          </h2>
        </section>
      )}

      {message && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
        >
          {error}
        </div>
      )}

      {isAdmin && tournamentStatus !== "completed" && (
        <section className="mt-8 rounded-2xl border border-violet-500/20 bg-[#11111b] p-6">
          <h2 className="text-xl font-black">Controle da competição</h2>

          {matches.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400">
              Confirme pelo menos duas inscrições antes de gerar a primeira
              rodada.
            </p>
          ) : latestRoundFinished ? (
            <p className="mt-2 text-sm text-zinc-400">
              A rodada atual terminou. Gere a próxima rodada para avançar os
              vencedores.
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              Registre todos os resultados da rodada atual antes de avançar.
            </p>
          )}

          <button
            type="button"
            disabled={!canGenerateRound || generating}
            onClick={generateRound}
            className="mt-5 rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating
              ? "Processando..."
              : matches.length === 0
                ? "Gerar primeira rodada"
                : "Gerar próxima rodada"}
          </button>
        </section>
      )}

      {matches.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <h2 className="text-xl font-bold">Chave ainda não gerada</h2>

          <p className="mt-2 text-zinc-400">
            Os confrontos aparecerão após a confirmação dos participantes.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto pb-4">
          <div className="flex min-w-max items-start gap-6">
            {rounds.map((round) => (
              <section key={round.roundNumber} className="w-[320px] shrink-0">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black">
                    {getRoundName(round.roundNumber, rounds.length)}
                  </h2>

                  <span className="text-xs text-zinc-500">
                    {round.matches.length} confronto(s)
                  </span>
                </div>

                <div className="space-y-5">
                  {round.matches.map((match) => {
                    const winnerName = getWinnerName(match);
                    const updating = updatingMatchId === match.match_id;
                    const matchScores = scores[match.match_id] || {
                      playerOne: "",
                      playerTwo: "",
                    };

                    return (
                      <article
                        key={match.match_id}
                        className="rounded-2xl border border-white/10 bg-[#11111b] p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Confronto {match.match_number}
                          </p>

                          <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase text-zinc-400">
                            {match.match_status === "completed"
                              ? "Finalizado"
                              : match.match_status === "bye"
                                ? "Bye"
                                : "Pendente"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div
                            className={`rounded-xl border p-3 ${
                              match.winner_registration_id ===
                              match.player_one_registration_id
                                ? "border-green-500/30 bg-green-500/10"
                                : "border-white/10 bg-black/20"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="break-words font-bold">
                                  {match.player_one_name}
                                </p>

                                {match.player_one_username && (
                                  <p className="mt-1 text-xs text-zinc-500">
                                    @{match.player_one_username}
                                  </p>
                                )}
                              </div>

                              {match.player_one_score !== null && (
                                <span className="text-xl font-black">
                                  {match.player_one_score}
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className={`rounded-xl border p-3 ${
                              match.winner_registration_id ===
                                match.player_two_registration_id &&
                              match.player_two_registration_id
                                ? "border-green-500/30 bg-green-500/10"
                                : "border-white/10 bg-black/20"
                            }`}
                          >
                            {match.player_two_registration_id ? (
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="break-words font-bold">
                                    {match.player_two_name || "Master"}
                                  </p>

                                  {match.player_two_username && (
                                    <p className="mt-1 text-xs text-zinc-500">
                                      @{match.player_two_username}
                                    </p>
                                  )}
                                </div>

                                {match.player_two_score !== null && (
                                  <span className="text-xl font-black">
                                    {match.player_two_score}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-500">
                                Avança automaticamente
                              </p>
                            )}
                          </div>
                        </div>

                        {winnerName && (
                          <p className="mt-4 text-sm font-semibold text-green-300">
                            Vencedor: {winnerName}
                          </p>
                        )}

                        {isAdmin &&
                          match.match_status !== "completed" &&
                          match.match_status !== "bye" &&
                          match.player_two_registration_id && (
                            <div className="mt-5 border-t border-white/10 pt-5">
                              <p className="text-sm font-semibold">
                                Informar resultado
                              </p>

                              <div className="mt-3 grid grid-cols-2 gap-3">
                                <div>
                                  <label
                                    htmlFor={`score-one-${match.match_id}`}
                                    className="text-xs text-zinc-500"
                                  >
                                    {match.player_one_name}
                                  </label>

                                  <input
                                    id={`score-one-${match.match_id}`}
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={matchScores.playerOne}
                                    disabled={updating}
                                    onChange={(event) =>
                                      setScores((current) => ({
                                        ...current,
                                        [match.match_id]: {
                                          ...matchScores,
                                          playerOne: event.target.value,
                                        },
                                      }))
                                    }
                                    className="mt-2 w-full rounded-lg border border-white/15 bg-[#171721] px-3 py-2 text-white outline-none focus:border-violet-500"
                                  />
                                </div>

                                <div>
                                  <label
                                    htmlFor={`score-two-${match.match_id}`}
                                    className="text-xs text-zinc-500"
                                  >
                                    {match.player_two_name || "Jogador 2"}
                                  </label>

                                  <input
                                    id={`score-two-${match.match_id}`}
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={matchScores.playerTwo}
                                    disabled={updating}
                                    onChange={(event) =>
                                      setScores((current) => ({
                                        ...current,
                                        [match.match_id]: {
                                          ...matchScores,
                                          playerTwo: event.target.value,
                                        },
                                      }))
                                    }
                                    className="mt-2 w-full rounded-lg border border-white/15 bg-[#171721] px-3 py-2 text-white outline-none focus:border-violet-500"
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={updating || Boolean(updatingMatchId)}
                                onClick={() => recordResult(match)}
                                className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50"
                              >
                                {updating
                                  ? "Salvando..."
                                  : "Registrar resultado"}
                              </button>
                            </div>
                          )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
