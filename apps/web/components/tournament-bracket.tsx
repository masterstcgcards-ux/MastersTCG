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
      {championMatch && getWinnerName(championMatch) && (
        <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-white p-8 text-center shadow-sm">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-yellow-300/30 blur-3xl"
          />

          <div className="relative">
            <div className="text-5xl">🏆</div>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-amber-700">
              Campeão
            </p>

            <h2 className="mt-3 break-words text-3xl font-black text-[#071a4c]">
              {getWinnerName(championMatch)}
            </h2>
          </div>
        </section>
      )}

      {message && (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      {isAdmin && tournamentStatus !== "completed" && (
        <section className="mt-8 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
            Administração
          </span>

          <h2 className="mt-4 text-xl font-black text-[#071a4c]">
            Controle da competição
          </h2>

          {matches.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Confirme pelo menos duas inscrições antes de gerar a primeira
              rodada.
            </p>
          ) : latestRoundFinished ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              A rodada atual terminou. Gere a próxima rodada para avançar os
              vencedores.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Registre todos os resultados da rodada atual antes de avançar.
            </p>
          )}

          <button
            type="button"
            disabled={!canGenerateRound || generating}
            onClick={generateRound}
            className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
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
        <div className="mt-8 rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600">
            ◇
          </div>

          <h2 className="mt-5 text-xl font-black text-[#071a4c]">
            Chave ainda não gerada
          </h2>

          <p className="mt-2 text-slate-600">
            Os confrontos aparecerão após a confirmação dos participantes.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto pb-5">
          <div className="flex min-w-max items-start gap-6">
            {rounds.map((round) => (
              <section key={round.roundNumber} className="w-[320px] shrink-0">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-[#071a4c]">
                    {getRoundName(round.roundNumber, rounds.length)}
                  </h2>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
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
                        className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50 px-5 py-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                            Confronto {match.match_number}
                          </p>

                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${
                              match.match_status === "completed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : match.match_status === "bye"
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {match.match_status === "completed"
                              ? "Finalizado"
                              : match.match_status === "bye"
                                ? "Bye"
                                : "Pendente"}
                          </span>
                        </div>

                        <div className="p-5">
                          <div className="space-y-3">
                            <div
                              className={`rounded-xl border p-3 ${
                                match.winner_registration_id ===
                                match.player_one_registration_id
                                  ? "border-emerald-200 bg-emerald-50"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="break-words font-bold text-[#071a4c]">
                                    {match.player_one_name}
                                  </p>

                                  {match.player_one_username && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      @{match.player_one_username}
                                    </p>
                                  )}
                                </div>

                                {match.player_one_score !== null && (
                                  <span className="text-xl font-black text-[#071a4c]">
                                    {match.player_one_score}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-center text-xs font-black uppercase text-slate-400">
                              versus
                            </div>

                            <div
                              className={`rounded-xl border p-3 ${
                                match.winner_registration_id ===
                                  match.player_two_registration_id &&
                                match.player_two_registration_id
                                  ? "border-emerald-200 bg-emerald-50"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              {match.player_two_registration_id ? (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="break-words font-bold text-[#071a4c]">
                                      {match.player_two_name || "Master"}
                                    </p>

                                    {match.player_two_username && (
                                      <p className="mt-1 text-xs text-slate-500">
                                        @{match.player_two_username}
                                      </p>
                                    )}
                                  </div>

                                  {match.player_two_score !== null && (
                                    <span className="text-xl font-black text-[#071a4c]">
                                      {match.player_two_score}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm font-semibold text-slate-500">
                                  Avança automaticamente
                                </p>
                              )}
                            </div>
                          </div>

                          {winnerName && (
                            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                              Vencedor: {winnerName}
                            </p>
                          )}

                          {isAdmin &&
                            match.match_status !== "completed" &&
                            match.match_status !== "bye" &&
                            match.player_two_registration_id && (
                              <div className="mt-5 border-t border-blue-100 pt-5">
                                <p className="text-sm font-bold text-[#071a4c]">
                                  Informar resultado
                                </p>

                                <div className="mt-3 grid grid-cols-2 gap-3">
                                  <div>
                                    <label
                                      htmlFor={`score-one-${match.match_id}`}
                                      className="text-xs font-semibold text-slate-500"
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
                                      className="mt-2 w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-[#071a4c] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                  </div>

                                  <div>
                                    <label
                                      htmlFor={`score-two-${match.match_id}`}
                                      className="text-xs font-semibold text-slate-500"
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
                                      className="mt-2 w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-[#071a4c] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    updating || Boolean(updatingMatchId)
                                  }
                                  onClick={() => recordResult(match)}
                                  className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {updating
                                    ? "Salvando..."
                                    : "Registrar resultado"}
                                </button>
                              </div>
                            )}
                        </div>
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
