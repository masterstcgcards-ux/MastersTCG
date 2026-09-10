"use client";

import { useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type TournamentRegistrationReview = {
  registration_id: string;
  player_id: string;
  player_name: string;
  player_username: string | null;
  deck_name: string;
  deck_format: string | null;
  deck_snapshot: unknown;
  card_count: number;
  registration_status: string;
  registered_at: string;
};

type RegistrationReviewProps = {
  initialRegistrations: TournamentRegistrationReview[];
};

type SnapshotCard = {
  user_card_id?: string;
  card_name?: string | null;
  set_name?: string | null;
  set_code?: string | null;
  card_number?: string | null;
  language?: string | null;
  quantity?: number;
};

const statusLabels: Record<string, string> = {
  pending: "Pendente de revisão",
  confirmed: "Confirmada",
  rejected: "Não aprovada",
  cancelled: "Cancelada pelo jogador",
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  confirmed: "bg-green-500/15 text-green-300",
  rejected: "bg-red-500/15 text-red-300",
  cancelled: "bg-zinc-500/15 text-zinc-300",
};

const formatLabels: Record<string, string> = {
  standard: "Padrão",
  expanded: "Expandido",
  casual: "Casual",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function getSnapshotCards(value: unknown): SnapshotCard[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is SnapshotCard => typeof item === "object" && item !== null,
  );
}

export function RegistrationReview({
  initialRegistrations,
}: RegistrationReviewProps) {
  const submitting = useRef(false);

  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const pendingCount = registrations.filter(
    (registration) => registration.registration_status === "pending",
  ).length;

  const confirmedCount = registrations.filter(
    (registration) => registration.registration_status === "confirmed",
  ).length;

  async function reviewRegistration(
    registration: TournamentRegistrationReview,
    newStatus: "confirmed" | "rejected",
  ) {
    if (submitting.current) {
      return;
    }

    if (
      registration.registration_status === "cancelled" ||
      registration.registration_status === newStatus
    ) {
      return;
    }

    if (newStatus === "rejected") {
      const confirmed = window.confirm(
        `Marcar a inscrição de ${registration.player_name} como não aprovada?`,
      );

      if (!confirmed) {
        return;
      }
    }

    submitting.current = true;
    setUpdatingId(registration.registration_id);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const { error: reviewError } = await supabase.rpc(
        "review_tournament_registration",
        {
          p_registration_id: registration.registration_id,
          p_new_status: newStatus,
        },
      );

      if (reviewError) {
        throw new Error(reviewError.message);
      }

      setRegistrations((current) =>
        current.map((item) =>
          item.registration_id === registration.registration_id
            ? {
                ...item,
                registration_status: newStatus,
              }
            : item,
        ),
      );

      setMessage(
        newStatus === "confirmed"
          ? `Inscrição de ${registration.player_name} confirmada.`
          : `Inscrição de ${registration.player_name} não aprovada.`,
      );
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Não foi possível atualizar a inscrição.",
      );
    } finally {
      submitting.current = false;
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#11111b] p-5">
          <p className="text-sm text-zinc-400">Total de inscrições</p>
          <p className="mt-2 text-3xl font-black">{registrations.length}</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-sm text-amber-200">Pendentes de revisão</p>
          <p className="mt-2 text-3xl font-black text-amber-300">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
          <p className="text-sm text-green-200">Confirmadas</p>
          <p className="mt-2 text-3xl font-black text-green-300">
            {confirmedCount}
          </p>
        </div>
      </div>

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

      {registrations.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <h2 className="text-xl font-bold">Nenhuma inscrição recebida</h2>

          <p className="mt-2 text-zinc-400">
            As inscrições aparecerão aqui quando os jogadores enviarem seus
            decks.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {registrations.map((registration) => {
            const cards = getSnapshotCards(registration.deck_snapshot);
            const updating = updatingId === registration.registration_id;

            return (
              <article
                key={registration.registration_id}
                className="rounded-2xl border border-white/10 bg-[#11111b] p-6"
              >
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                      Jogador
                    </p>

                    <h2 className="mt-2 break-words text-2xl font-black">
                      {registration.player_name}
                    </h2>

                    {registration.player_username && (
                      <p className="mt-1 text-sm text-zinc-500">
                        @{registration.player_username}
                      </p>
                    )}

                    <p className="mt-3 text-sm text-zinc-400">
                      Inscrição enviada em{" "}
                      {formatDate(registration.registered_at)}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-4 py-2 text-xs font-bold ${
                      statusStyles[registration.registration_status] ||
                      statusStyles.pending
                    }`}
                  >
                    {statusLabels[registration.registration_status] ||
                      registration.registration_status}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 rounded-xl border border-white/10 bg-black/20 p-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-zinc-500">Deck</p>
                    <p className="mt-1 break-words font-bold">
                      {registration.deck_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">Formato</p>
                    <p className="mt-1 font-bold">
                      {registration.deck_format
                        ? formatLabels[registration.deck_format] ||
                          registration.deck_format
                        : "Não informado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">Total de cartas</p>
                    <p className="mt-1 font-bold">{registration.card_count}</p>
                  </div>
                </div>

                <details className="mt-5 rounded-xl border border-white/10 p-5">
                  <summary className="cursor-pointer font-bold">
                    Ver lista enviada ({cards.length} registros)
                  </summary>

                  {cards.length === 0 ? (
                    <p className="mt-4 text-sm text-red-300">
                      A lista enviada está vazia ou não pôde ser interpretada.
                    </p>
                  ) : (
                    <div className="mt-4 divide-y divide-white/10">
                      {cards.map((card, index) => (
                        <div
                          key={
                            card.user_card_id || `${card.card_name}-${index}`
                          }
                          className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                        >
                          <div>
                            <p className="font-semibold">
                              {card.card_name || "Carta sem nome"}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {card.set_name || "Coleção não informada"}
                              {card.card_number ? ` • ${card.card_number}` : ""}
                              {card.language ? ` • ${card.language}` : ""}
                            </p>
                          </div>

                          <span className="w-fit rounded-lg bg-violet-500/10 px-3 py-1 text-sm font-bold text-violet-300">
                            {Number(card.quantity || 0)}x
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </details>

                {registration.registration_status !== "cancelled" && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={
                        updating ||
                        Boolean(updatingId) ||
                        registration.registration_status === "confirmed"
                      }
                      onClick={() =>
                        reviewRegistration(registration, "confirmed")
                      }
                      className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {updating
                        ? "Atualizando..."
                        : registration.registration_status === "confirmed"
                          ? "Inscrição confirmada"
                          : "Confirmar inscrição"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        updating ||
                        Boolean(updatingId) ||
                        registration.registration_status === "rejected"
                      }
                      onClick={() =>
                        reviewRegistration(registration, "rejected")
                      }
                      className="rounded-xl border border-red-500/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {updating
                        ? "Atualizando..."
                        : registration.registration_status === "rejected"
                          ? "Inscrição não aprovada"
                          : "Não aprovar"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
