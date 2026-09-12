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
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-600",
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
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Total de inscrições
          </p>

          <p className="mt-2 text-3xl font-black text-[#071a4c]">
            {registrations.length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-amber-800">
            Pendentes de revisão
          </p>

          <p className="mt-2 text-3xl font-black text-amber-700">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">Confirmadas</p>

          <p className="mt-2 text-3xl font-black text-emerald-700">
            {confirmedCount}
          </p>
        </div>
      </div>

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

      {registrations.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600">
            ◇
          </div>

          <h2 className="mt-5 text-xl font-black text-[#071a4c]">
            Nenhuma inscrição recebida
          </h2>

          <p className="mt-2 text-slate-600">
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
                className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"
              >
                <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                        Jogador
                      </p>

                      <h2 className="mt-2 break-words text-2xl font-black text-[#071a4c]">
                        {registration.player_name}
                      </h2>

                      {registration.player_username && (
                        <p className="mt-1 text-sm font-semibold text-blue-600">
                          @{registration.player_username}
                        </p>
                      )}

                      <p className="mt-3 text-sm text-slate-500">
                        Inscrição enviada em{" "}
                        {formatDate(registration.registered_at)}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full border px-4 py-2 text-xs font-bold ${
                        statusStyles[registration.registration_status] ||
                        statusStyles.pending
                      }`}
                    >
                      {statusLabels[registration.registration_status] ||
                        registration.registration_status}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="col-span-2 rounded-xl bg-slate-50 p-4 sm:col-span-1">
                      <p className="text-xs font-semibold text-slate-500">
                        Deck
                      </p>

                      <p className="mt-1 break-words font-bold text-[#071a4c]">
                        {registration.deck_name}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">
                        Formato
                      </p>

                      <p className="mt-1 font-bold text-[#071a4c]">
                        {registration.deck_format
                          ? formatLabels[registration.deck_format] ||
                            registration.deck_format
                          : "Não informado"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-xs font-semibold text-blue-600">
                        Total de cartas
                      </p>

                      <p className="mt-1 font-black text-blue-700">
                        {registration.card_count}
                      </p>
                    </div>
                  </div>

                  <details className="mt-5 overflow-hidden rounded-2xl border border-blue-100">
                    <summary className="cursor-pointer bg-blue-50 px-5 py-4 font-bold text-blue-700">
                      Ver lista enviada ({cards.length} registros)
                    </summary>

                    {cards.length === 0 ? (
                      <p className="border-t border-blue-100 p-5 text-sm font-semibold text-red-600">
                        A lista enviada está vazia ou não pôde ser interpretada.
                      </p>
                    ) : (
                      <div className="divide-y divide-blue-100 border-t border-blue-100 px-5">
                        {cards.map((card, index) => (
                          <div
                            key={
                              card.user_card_id || `${card.card_name}-${index}`
                            }
                            className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              <p className="font-bold text-[#071a4c]">
                                {card.card_name || "Carta sem nome"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {card.set_name || "Coleção não informada"}
                                {card.card_number
                                  ? ` • ${card.card_number}`
                                  : ""}
                                {card.language ? ` • ${card.language}` : ""}
                              </p>
                            </div>

                            <span className="w-fit rounded-lg bg-blue-100 px-3 py-1 text-sm font-black text-blue-700">
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
                        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {updating
                          ? "Atualizando..."
                          : registration.registration_status === "rejected"
                            ? "Inscrição não aprovada"
                            : "Não aprovar"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
