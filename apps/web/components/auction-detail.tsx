"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
          {message}

          {auction.auction_status === "ended" && auction.is_highest_bidder && (
            <Link href="/orders" className="ml-2 font-bold underline">
              Ver pedido
            </Link>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
        >
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#13131d]">
          <div className="aspect-[4/3] bg-black/30">
            {auction.front_image_url ? (
              <img
                src={auction.front_image_url}
                alt={auction.card_name}
                className="h-full w-full object-contain p-6"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-600">
                Imagem não disponível
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-200">
                Leilão
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  auction.auction_status === "active"
                    ? "bg-emerald-500/15 text-emerald-200"
                    : auction.auction_status === "cancelled"
                      ? "bg-red-500/15 text-red-200"
                      : "bg-violet-500/15 text-violet-200"
                }`}
              >
                {auction.auction_status === "active"
                  ? "Em andamento"
                  : auction.auction_status === "cancelled"
                    ? "Cancelado"
                    : "Encerrado"}
              </span>
            </div>

            <h1 className="mt-5 break-words text-3xl font-black sm:text-4xl">
              {auction.title}
            </h1>

            <p className="mt-4 text-xl font-bold">{auction.card_name}</p>

            <p className="mt-1 text-zinc-500">
              {auction.set_name || "Coleção não informada"}
              {auction.card_number ? ` · ${auction.card_number}` : ""}
            </p>

            {auction.description && (
              <p className="mt-6 whitespace-pre-wrap break-words leading-7 text-zinc-300">
                {auction.description}
              </p>
            )}

            <dl className="mt-8 grid gap-5 border-t border-white/10 pt-6 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Vendedor</dt>
                <dd className="mt-1 font-semibold">{sellerName}</dd>
              </div>

              <div>
                <dt className="text-zinc-500">Quantidade</dt>
                <dd className="mt-1 font-semibold">{auction.quantity}</dd>
              </div>

              <div>
                <dt className="text-zinc-500">Localização</dt>
                <dd className="mt-1 font-semibold">
                  {[auction.city, auction.state].filter(Boolean).join(" - ") ||
                    "Não informada"}
                </dd>
              </div>

              <div>
                <dt className="text-zinc-500">Envio</dt>
                <dd className="mt-1 font-semibold">
                  {auction.shipping_available ? "Disponível" : "A combinar"}
                </dd>
              </div>
            </dl>
          </div>
        </article>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-violet-500/20 bg-[#13131d] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
              {auction.bid_count > 0 ? "Maior lance" : "Lance inicial"}
            </p>

            <p className="mt-2 text-4xl font-black">
              {formatCurrency(auction.current_price)}
            </p>

            <p className="mt-2 text-sm text-zinc-400">
              {auction.bid_count} {auction.bid_count === 1 ? "lance" : "lances"}{" "}
              registrados
            </p>

            <div className="mt-6 rounded-xl bg-black/30 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Tempo restante
              </p>

              <p
                className={`mt-2 text-2xl font-black ${
                  remainingTime.expired ? "text-red-300" : "text-yellow-200"
                }`}
              >
                {auction.auction_status !== "active"
                  ? "Encerrado"
                  : remainingTime.expired
                    ? "Prazo encerrado"
                    : remainingTime.label}
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                {formatDate(auction.ends_at)}
              </p>
            </div>

            {auction.is_highest_bidder &&
              auction.auction_status === "active" && (
                <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">
                  Você possui o maior lance.
                </div>
              )}

            {!auction.is_own &&
              auction.auction_status === "active" &&
              !remainingTime.expired && (
                <form onSubmit={handleBid} className="mt-6">
                  <label
                    htmlFor="bid-amount"
                    className="mb-2 block text-sm font-semibold"
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
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-lg font-bold outline-none focus:border-violet-500"
                  />

                  <p className="mt-2 text-xs text-zinc-500">
                    Lance mínimo: {formatCurrency(minimumBid)}
                  </p>

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      auction.is_highest_bidder ||
                      bidAmount < minimumBid
                    }
                    className="mt-5 w-full rounded-xl bg-violet-600 px-5 py-4 text-sm font-black text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="mt-6 w-full rounded-xl bg-violet-600 px-5 py-4 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-50"
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
                  className="mt-5 w-full rounded-xl border border-red-500/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
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
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#13131d] p-6">
            <h2 className="text-xl font-black">Histórico de lances</h2>

            {bids.length === 0 ? (
              <p className="mt-5 text-sm text-zinc-500">
                Este leilão ainda não recebeu lances.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {bids.map((bid, index) => (
                  <div
                    key={bid.bid_id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/10 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {bid.is_own
                          ? "Você"
                          : bid.bidder_display_name ||
                            bid.bidder_username ||
                            "Master"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDate(bid.created_at)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black">{formatCurrency(bid.amount)}</p>

                      {index === 0 && (
                        <p className="mt-1 text-xs font-bold text-emerald-300">
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
