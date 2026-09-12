"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import type { MarketplaceAuction } from "@/components/auctions-manager";
import { ReportForm } from "@/components/report-form";
import { createClient } from "@/lib/supabase/client";

export type AuctionBid = {
  bid_id: string;
  bidder_id: string;
  bidder_display_name: string | null;
  bidder_username: string | null;
  is_own: boolean;
  amount: number;
  created_at: string;
};

type AuctionDetailProps = {
  initialAuction: MarketplaceAuction;
  initialBids: AuctionBid[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function getRemainingTime(endsAt: string) {
  const difference = Math.max(0, new Date(endsAt).getTime() - Date.now());

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    expired: difference <= 0,
    label:
      days > 0
        ? `${days}d ${hours}h ${minutes}min`
        : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
            2,
            "0",
          )}:${String(seconds).padStart(2, "0")}`,
  };
}

export function AuctionDetail({
  initialAuction,
  initialBids,
}: AuctionDetailProps) {
  const router = useRouter();
  const submittingRef = useRef(false);

  const [auction, setAuction] = useState(initialAuction);
  const [bids, setBids] = useState(initialBids);
  const [now, setNow] = useState(Date.now());
  const [bidAmount, setBidAmount] = useState(() =>
    initialAuction.bid_count === 0
      ? initialAuction.starting_price
      : initialAuction.current_price + initialAuction.minimum_increment,
  );
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const remainingTime = useMemo(
    () => getRemainingTime(auction.ends_at),
    [auction.ends_at, now],
  );

  const minimumBid =
    auction.bid_count === 0
      ? auction.starting_price
      : auction.current_price + auction.minimum_increment;

  async function handleBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setMessage("");
    setError("");

    const supabase = createClient();

    const { data, error: bidError } = await supabase.rpc(
      "place_marketplace_bid",
      {
        p_auction_id: auction.auction_id,
        p_amount: bidAmount,
      },
    );

    if (bidError) {
      setError(bidError.message || "Não foi possível registrar o lance.");
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    const newBid: AuctionBid = {
      bid_id: String(data),
      bidder_id: "current-user",
      bidder_display_name: "Você",
      bidder_username: null,
      is_own: true,
      amount: bidAmount,
      created_at: new Date().toISOString(),
    };

    setBids((current) => [
      newBid,
      ...current.map((bid) => ({
        ...bid,
        is_own: false,
      })),
    ]);

    setAuction((current) => ({
      ...current,
      current_price: bidAmount,
      bid_count: current.bid_count + 1,
      is_highest_bidder: true,
    }));

    setBidAmount(bidAmount + auction.minimum_increment);
    setMessage("Lance registrado! Você está vencendo este leilão.");
    submittingRef.current = false;
    setSubmitting(false);
    router.refresh();
  }

  async function handleFinalize() {
    if (finalizing) {
      return;
    }

    setFinalizing(true);
    setMessage("");
    setError("");

    const supabase = createClient();

    const { data, error: finalizeError } = await supabase.rpc(
      "finalize_marketplace_auction",
      {
        p_auction_id: auction.auction_id,
      },
    );

    if (finalizeError) {
      setError(finalizeError.message || "Não foi possível encerrar o leilão.");
      setFinalizing(false);
      return;
    }

    setAuction((current) => ({
      ...current,
      auction_status: "ended",
    }));

    setMessage(
      data
        ? "Leilão encerrado! O pedido do vencedor foi criado."
        : "Leilão encerrado sem lances.",
    );

    setFinalizing(false);
    router.refresh();
  }

  async function handleCancel() {
    if (
      cancelling ||
      !window.confirm("Deseja realmente cancelar este leilão?")
    ) {
      return;
    }

    setCancelling(true);
    setMessage("");
    setError("");

    const supabase = createClient();

    const { error: cancelError } = await supabase.rpc(
      "cancel_marketplace_auction",
      {
        p_auction_id: auction.auction_id,
      },
    );

    if (cancelError) {
      setError(cancelError.message || "Não foi possível cancelar o leilão.");
      setCancelling(false);
      return;
    }

    setAuction((current) => ({
      ...current,
      auction_status: "cancelled",
    }));

    setMessage("Leilão cancelado.");
    setCancelling(false);
    router.refresh();
  }

  const sellerName =
    auction.seller_display_name || auction.seller_username || "Master";

  return (
    <div>
      {message && (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700"
        >
          {message}

          {auction.auction_status === "ended" && auction.is_highest_bidder && (
            <Link
              href="/orders"
              className="ml-2 font-black text-emerald-800 underline"
            >
              Ver pedido
            </Link>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <article className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="flex items-center justify-center border-b border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-6 sm:p-10">
            {auction.front_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={auction.front_image_url}
                alt={auction.card_name}
                className="aspect-[2.5/3.5] max-h-[560px] w-auto max-w-full rounded-2xl object-contain drop-shadow-xl"
              />
            ) : (
              <div className="flex aspect-[2.5/3.5] h-[420px] max-w-full items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-white px-6 text-center text-slate-400">
                Imagem não disponível
              </div>
            )}
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
                Leilão
              </span>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  auction.auction_status === "active"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : auction.auction_status === "cancelled"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {auction.auction_status === "active"
                  ? "Em andamento"
                  : auction.auction_status === "cancelled"
                    ? "Cancelado"
                    : "Encerrado"}
              </span>
            </div>

            <h1 className="mt-5 break-words text-3xl font-black text-[#071a4c] sm:text-4xl">
              {auction.title}
            </h1>

            <p className="mt-4 text-xl font-bold text-slate-800">
              {auction.card_name}
            </p>

            <p className="mt-1 text-slate-500">
              {auction.set_name || "Coleção não informada"}
              {auction.card_number ? ` · ${auction.card_number}` : ""}
            </p>

            {auction.description && (
              <p className="mt-6 whitespace-pre-wrap break-words leading-7 text-slate-600">
                {auction.description}
              </p>
            )}

            <dl className="mt-8 grid grid-cols-2 gap-3 border-t border-blue-100 pt-6 text-sm">
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">
                  Vendedor
                </dt>
                <dd className="mt-1 break-words font-bold text-[#071a4c]">
                  {sellerName}
                </dd>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">
                  Quantidade
                </dt>
                <dd className="mt-1 font-bold text-[#071a4c]">
                  {auction.quantity}
                </dd>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">
                  Localização
                </dt>
                <dd className="mt-1 break-words font-bold text-[#071a4c]">
                  {[auction.city, auction.state].filter(Boolean).join(" - ") ||
                    "Não informada"}
                </dd>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500">Envio</dt>
                <dd className="mt-1 font-bold text-[#071a4c]">
                  {auction.shipping_available ? "Disponível" : "A combinar"}
                </dd>
              </div>
            </dl>
          </div>
        </article>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 p-6 text-white">
              <div
                aria-hidden="true"
                className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-yellow-400/20 blur-3xl"
              />

              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
                  {auction.bid_count > 0 ? "Maior lance" : "Lance inicial"}
                </p>

                <p className="mt-2 break-words text-4xl font-black">
                  {formatCurrency(auction.current_price)}
                </p>

                <p className="mt-2 text-sm text-blue-100">
                  {auction.bid_count}{" "}
                  {auction.bid_count === 1 ? "lance" : "lances"} registrados
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Tempo restante
                </p>

                <p
                  className={`mt-2 text-2xl font-black ${
                    remainingTime.expired || auction.auction_status !== "active"
                      ? "text-red-600"
                      : "text-amber-600"
                  }`}
                >
                  {auction.auction_status !== "active"
                    ? "Encerrado"
                    : remainingTime.expired
                      ? "Prazo encerrado"
                      : remainingTime.label}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {formatDate(auction.ends_at)}
                </p>
              </div>

              {auction.is_highest_bidder &&
                auction.auction_status === "active" && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                    Você possui o maior lance.
                  </div>
                )}

              {!auction.is_own &&
                auction.auction_status === "active" &&
                !remainingTime.expired && (
                  <form onSubmit={handleBid} className="mt-6">
                    <label
                      htmlFor="bid-amount"
                      className="mb-2 block text-sm font-bold text-[#071a4c]"
                    >
                      Seu lance
                    </label>

                    <input
                      id="bid-amount"
                      type="number"
                      min={minimumBid}
                      step="0.01"
                      value={bidAmount}
                      onChange={(event) =>
                        setBidAmount(Number(event.target.value))
                      }
                      required
                      className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-lg font-bold text-[#071a4c] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Lance mínimo: {formatCurrency(minimumBid)}
                    </p>

                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        auction.is_highest_bidder ||
                        bidAmount < minimumBid
                      }
                      className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting
                        ? "Registrando..."
                        : auction.is_highest_bidder
                          ? "Você está vencendo"
                          : "Dar lance"}
                    </button>
                  </form>
                )}

              {auction.auction_status === "active" && remainingTime.expired && (
                <button
                  type="button"
                  disabled={finalizing}
                  onClick={handleFinalize}
                  className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {finalizing ? "Encerrando..." : "Encerrar e definir vencedor"}
                </button>
              )}

              {auction.is_own &&
                auction.auction_status === "active" &&
                auction.bid_count === 0 &&
                !remainingTime.expired && (
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleCancel}
                    className="mt-5 w-full rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cancelling ? "Cancelando..." : "Cancelar leilão"}
                  </button>
                )}

              {!auction.is_own && (
                <ReportForm
                  targetType="auction"
                  targetId={auction.auction_id}
                  targetLabel="leilão"
                />
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                  Movimentação
                </p>

                <h2 className="mt-1 text-xl font-black text-[#071a4c]">
                  Histórico de lances
                </h2>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {bids.length}
              </span>
            </div>

            {bids.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-6 text-center">
                <p className="text-sm text-slate-500">
                  Este leilão ainda não recebeu lances.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {bids.map((bid, index) => (
                  <div
                    key={bid.bid_id}
                    className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
                      index === 0
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-blue-100 bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#071a4c]">
                        {bid.is_own
                          ? "Você"
                          : bid.bidder_display_name ||
                            bid.bidder_username ||
                            "Master"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(bid.created_at)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-black text-[#071a4c]">
                        {formatCurrency(bid.amount)}
                      </p>

                      {index === 0 && (
                        <p className="mt-1 text-xs font-bold text-emerald-700">
                          Maior lance
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
