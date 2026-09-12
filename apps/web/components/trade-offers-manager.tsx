"use client";

import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type TradeOffer = {
  offer_id: string;
  offer_status: string;
  listing_id: string;
  listing_status: string;
  listing_title: string;
  listing_card_name: string;
  listing_set_name: string | null;
  listing_card_number: string | null;
  listing_front_image_path: string | null;
  listing_quantity: number;
  sender_id: string;
  sender_display_name: string;
  sender_username: string | null;
  recipient_id: string;
  recipient_display_name: string;
  recipient_username: string | null;
  offered_user_card_id: string;
  offered_quantity: number;
  offered_card_name: string;
  offered_set_name: string | null;
  offered_card_number: string | null;
  offered_front_image_path: string | null;
  offer_message: string | null;
  created_at: string;
  responded_at: string | null;
  listing_image_url: string | null;
  offered_image_url: string | null;
};

type TradeOffersManagerProps = {
  initialReceivedOffers: TradeOffer[];
  initialSentOffers: TradeOffer[];
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceita",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

const statusStyles: Record<string, string> = {
  pending: "border border-amber-200 bg-amber-100 text-amber-800",
  accepted: "border border-emerald-200 bg-emerald-100 text-emerald-700",
  rejected: "border border-red-200 bg-red-100 text-red-700",
  cancelled: "border border-slate-200 bg-slate-100 text-slate-600",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function addImages(
  offer: Omit<TradeOffer, "listing_image_url" | "offered_image_url">,
  imageUrls: Map<string, string>,
): TradeOffer {
  return {
    ...offer,
    listing_image_url: offer.listing_front_image_path
      ? imageUrls.get(offer.listing_front_image_path) || null
      : null,
    offered_image_url: offer.offered_front_image_path
      ? imageUrls.get(offer.offered_front_image_path) || null
      : null,
  };
}

export function TradeOffersManager({
  initialReceivedOffers,
  initialSentOffers,
}: TradeOffersManagerProps) {
  const [receivedOffers, setReceivedOffers] = useState(initialReceivedOffers);
  const [sentOffers, setSentOffers] = useState(initialSentOffers);
  const [currentTab, setCurrentTab] = useState<"received" | "sent">("received");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const displayedOffers = useMemo(() => {
    const source = currentTab === "received" ? receivedOffers : sentOffers;

    if (statusFilter === "all") return source;

    return source.filter((offer) => offer.offer_status === statusFilter);
  }, [currentTab, receivedOffers, sentOffers, statusFilter]);

  const receivedPendingCount = receivedOffers.filter(
    (offer) => offer.offer_status === "pending",
  ).length;

  async function refreshOffers() {
    const supabase = createClient();

    const [receivedResult, sentResult] = await Promise.all([
      supabase.rpc("get_trade_offers", {
        p_scope: "received",
      }),
      supabase.rpc("get_trade_offers", {
        p_scope: "sent",
      }),
    ]);

    if (receivedResult.error) throw receivedResult.error;
    if (sentResult.error) throw sentResult.error;

    const receivedRows = Array.isArray(receivedResult.data)
      ? (receivedResult.data as Omit<
          TradeOffer,
          "listing_image_url" | "offered_image_url"
        >[])
      : [];

    const sentRows = Array.isArray(sentResult.data)
      ? (sentResult.data as Omit<
          TradeOffer,
          "listing_image_url" | "offered_image_url"
        >[])
      : [];

    const imagePaths = Array.from(
      new Set(
        [...receivedRows, ...sentRows]
          .flatMap((offer) => [
            offer.listing_front_image_path,
            offer.offered_front_image_path,
          ])
          .filter((path): path is string => Boolean(path)),
      ),
    );

    const imageUrls = new Map<string, string>();

    if (imagePaths.length > 0) {
      const { data: signedImages } = await supabase.storage
        .from("card-scans")
        .createSignedUrls(imagePaths, 60 * 60);

      signedImages?.forEach((image) => {
        if (image.path && image.signedUrl) {
          imageUrls.set(image.path, image.signedUrl);
        }
      });
    }

    setReceivedOffers(receivedRows.map((offer) => addImages(offer, imageUrls)));

    setSentOffers(sentRows.map((offer) => addImages(offer, imageUrls)));
  }

  async function handleRespond(
    offerId: string,
    decision: "accepted" | "rejected",
  ) {
    if (updatingId) return;

    const action = decision === "accepted" ? "aceitar" : "recusar";
    const confirmed = window.confirm(
      `Deseja realmente ${action} esta proposta?`,
    );

    if (!confirmed) return;

    setUpdatingId(offerId);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const { error: responseError } = await supabase.rpc(
        "respond_trade_offer",
        {
          p_offer_id: offerId,
          p_decision: decision,
        },
      );

      if (responseError) throw responseError;

      await refreshOffers();

      setMessage(
        decision === "accepted"
          ? "Proposta aceita! O anúncio foi reservado."
          : "Proposta recusada.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível responder à proposta.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCancel(offerId: string, accepted: boolean) {
    if (updatingId) return;

    const confirmed = window.confirm(
      accepted
        ? "Deseja cancelar o acordo? O anúncio voltará a ficar ativo."
        : "Deseja cancelar esta proposta?",
    );

    if (!confirmed) return;

    setUpdatingId(offerId);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const { error: cancelError } = await supabase.rpc("cancel_trade_offer", {
        p_offer_id: offerId,
      });

      if (cancelError) throw cancelError;

      await refreshOffers();

      setMessage(
        accepted
          ? "Acordo cancelado e anúncio reativado."
          : "Proposta cancelada.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível cancelar a proposta.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Área de negociação
            </p>

            <h2 className="mt-2 text-xl font-black text-[#071a4c]">
              Central de propostas
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Analise propostas recebidas e acompanhe as que você enviou.
            </p>
          </div>

          <div className="flex rounded-xl border border-blue-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setCurrentTab("received");
                setStatusFilter("all");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                currentTab === "received"
                  ? "bg-blue-700 text-white"
                  : "text-slate-600 hover:text-blue-700"
              }`}
            >
              Recebidas
              {receivedPendingCount > 0 && ` (${receivedPendingCount})`}
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentTab("sent");
                setStatusFilter("all");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                currentTab === "sent"
                  ? "bg-blue-700 text-white"
                  : "text-slate-600 hover:text-blue-700"
              }`}
            >
              Enviadas
            </button>
          </div>
        </div>

        <div className="mt-5 max-w-xs">
          <label
            htmlFor="offer-status-filter"
            className="text-sm font-semibold text-[#071a4c]"
          >
            Filtrar por situação
          </label>

          <select
            id="offer-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-[#071a4c] outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">Todas</option>
            <option value="pending">Pendentes</option>
            <option value="accepted">Aceitas</option>
            <option value="rejected">Recusadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </section>

      {message && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-medium text-emerald-700"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {displayedOffers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center text-slate-500">
          {currentTab === "received"
            ? "Você não possui propostas recebidas neste filtro."
            : "Você não possui propostas enviadas neste filtro."}
        </div>
      ) : (
        <div className="grid gap-6">
          {displayedOffers.map((offer) => {
            const updating = updatingId === offer.offer_id;

            return (
              <article
                key={offer.offer_id}
                className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      {currentTab === "received"
                        ? `Proposta de ${offer.sender_display_name}`
                        : `Enviada para ${offer.recipient_display_name}`}
                    </p>

                    <h3 className="mt-2 text-2xl font-black text-[#071a4c]">
                      {offer.listing_title}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      statusStyles[offer.offer_status] || statusStyles.cancelled
                    }`}
                  >
                    {statusLabels[offer.offer_status] || offer.offer_status}
                  </span>
                </div>

                <div className="mt-6 grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-5">
                  <div className="min-w-0 rounded-2xl border border-blue-100 bg-slate-50 p-3 sm:p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Carta anunciada
                    </p>

                    <div className="mt-4 flex justify-center">
                      <div className="flex aspect-[2.5/3.5] w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm">
                        {offer.listing_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={offer.listing_image_url}
                            alt={offer.listing_card_name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-24 w-16 flex-col items-center justify-center rounded-xl bg-blue-700 text-white">
                            <span className="text-3xl font-black">M</span>
                            <span className="text-[8px] font-bold tracking-wider text-yellow-300">
                              TCG
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 break-words font-bold text-[#071a4c]">
                      {offer.listing_card_name}
                    </p>

                    <p className="mt-1 break-words text-sm text-slate-500">
                      {[offer.listing_set_name, offer.listing_card_number]
                        .filter(Boolean)
                        .join(" • ") || "Sem detalhes adicionais"}
                    </p>
                  </div>

                  <div className="flex items-center justify-center text-3xl font-black text-blue-700">
                    <span className="sm:hidden">⇅</span>
                    <span className="hidden sm:inline">⇄</span>
                  </div>

                  <div className="min-w-0 rounded-2xl border border-blue-200 bg-blue-50 p-3 sm:p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Carta oferecida
                    </p>

                    <div className="mt-4 flex justify-center">
                      <div className="flex aspect-[2.5/3.5] w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm">
                        {offer.offered_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={offer.offered_image_url}
                            alt={offer.offered_card_name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-24 w-16 flex-col items-center justify-center rounded-xl bg-blue-700 text-white">
                            <span className="text-3xl font-black">M</span>
                            <span className="text-[8px] font-bold tracking-wider text-yellow-300">
                              TCG
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 break-words font-bold text-[#071a4c]">
                      {offer.offered_card_name}
                    </p>

                    <p className="mt-1 break-words text-sm text-slate-500">
                      {[offer.offered_set_name, offer.offered_card_number]
                        .filter(Boolean)
                        .join(" • ") || "Sem detalhes adicionais"}
                    </p>

                    <p className="mt-2 text-sm font-bold text-blue-700">
                      Quantidade: {offer.offered_quantity}
                    </p>
                  </div>
                </div>

                {offer.offer_message && (
                  <div className="mt-5 rounded-xl border border-blue-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Mensagem
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
                      {offer.offer_message}
                    </p>
                  </div>
                )}

                {offer.offer_status === "accepted" && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800">
                    <strong>Proposta aceita.</strong> As cartas ainda não foram
                    transferidas automaticamente. Os participantes devem
                    combinar a conclusão da troca com segurança.
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-blue-100 pt-5">
                  <p className="text-xs text-slate-400">
                    Enviada em {formatDate(offer.created_at)}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {currentTab === "received" &&
                      offer.offer_status === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() =>
                              handleRespond(offer.offer_id, "accepted")
                            }
                            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {updating ? "Atualizando..." : "Aceitar"}
                          </button>

                          <button
                            type="button"
                            disabled={updating}
                            onClick={() =>
                              handleRespond(offer.offer_id, "rejected")
                            }
                            className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            Recusar
                          </button>
                        </>
                      )}

                    {currentTab === "sent" &&
                      offer.offer_status === "pending" && (
                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => handleCancel(offer.offer_id, false)}
                          className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {updating ? "Cancelando..." : "Cancelar proposta"}
                        </button>
                      )}

                    {offer.offer_status === "accepted" && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => handleCancel(offer.offer_id, true)}
                        className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        {updating ? "Cancelando..." : "Cancelar acordo"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
