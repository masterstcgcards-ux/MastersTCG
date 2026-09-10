"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export type AuctionCollectionCard = {
  id: string;
  quantity: number;
  card_name: string | null;
  set_name: string | null;
  card_number: string | null;
  front_image_path: string | null;
  front_image_url: string | null;
};

export type MarketplaceAuction = {
  auction_id: string;
  listing_id: string;
  seller_id: string;
  seller_display_name: string | null;
  seller_username: string | null;
  is_own: boolean;
  title: string;
  description: string | null;
  quantity: number;
  shipping_available: boolean;
  city: string | null;
  state: string | null;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  front_image_path: string | null;
  front_image_url: string | null;
  starting_price: number;
  minimum_increment: number;
  current_price: number;
  bid_count: number;
  highest_bidder_id: string | null;
  is_highest_bidder: boolean;
  starts_at: string;
  ends_at: string;
  auction_status: string;
  created_at: string;
};

type AuctionsManagerProps = {
  initialAllAuctions: MarketplaceAuction[];
  initialMyAuctions: MarketplaceAuction[];
  initialBidAuctions: MarketplaceAuction[];
  collectionCards: AuctionCollectionCard[];
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  active: "Em andamento",
  ended: "Encerrado",
  cancelled: "Cancelado",
};

const statusStyles: Record<string, string> = {
  draft: "bg-zinc-500/15 text-zinc-300",
  active: "bg-emerald-500/15 text-emerald-200",
  ended: "bg-violet-500/15 text-violet-200",
  cancelled: "bg-red-500/15 text-red-200",
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
    timeStyle: "short",
  }).format(new Date(value));
}

function getDefaultEndDate() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function getTimeDescription(endsAt: string, status: string) {
  if (status !== "active") {
    return "Leilão encerrado";
  }

  const difference = new Date(endsAt).getTime() - Date.now();

  if (difference <= 0) {
    return "Prazo encerrado";
  }

  const totalMinutes = Math.floor(difference / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h restantes`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}min restantes`;
  }

  return `${Math.max(1, minutes)}min restantes`;
}

export function AuctionsManager({
  initialAllAuctions,
  initialMyAuctions,
  initialBidAuctions,
  collectionCards,
}: AuctionsManagerProps) {
  const router = useRouter();
  const submittingRef = useRef(false);

  const [currentTab, setCurrentTab] = useState<"all" | "bids" | "mine">("all");
  const [allAuctions, setAllAuctions] = useState(initialAllAuctions);
  const [myAuctions, setMyAuctions] = useState(initialMyAuctions);
  const [bidAuctions, setBidAuctions] = useState(initialBidAuctions);
  const [selectedCardId, setSelectedCardId] = useState(
    collectionCards[0]?.id || "",
  );
  const [creating, setCreating] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCard = collectionCards.find(
    (card) => card.id === selectedCardId,
  );

  const visibleAuctions = useMemo(() => {
    if (currentTab === "mine") {
      return myAuctions;
    }

    if (currentTab === "bids") {
      return bidAuctions;
    }

    return allAuctions;
  }, [allAuctions, bidAuctions, currentTab, myAuctions]);

  function changeTab(tab: "all" | "bids" | "mine") {
    setCurrentTab(tab);
    setMessage("");
    setError("");
  }

  async function handleCreateAuction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    if (!selectedCardId) {
      setError("Escolha uma carta da sua coleção.");
      return;
    }

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const endsAtValue = String(formData.get("ends_at") || "");
    const endsAt = new Date(endsAtValue);

    if (!endsAtValue || Number.isNaN(endsAt.getTime())) {
      setError("Informe uma data de encerramento válida.");
      return;
    }

    submittingRef.current = true;
    setCreating(true);
    setMessage("");
    setError("");

    const supabase = createClient();

    const { error: createError } = await supabase.rpc(
      "create_marketplace_auction",
      {
        p_user_card_id: selectedCardId,
        p_title: String(formData.get("title") || ""),
        p_quantity: Number(formData.get("quantity") || 1),
        p_starting_price: Number(formData.get("starting_price") || 0),
        p_minimum_increment: Number(formData.get("minimum_increment") || 0),
        p_ends_at: endsAt.toISOString(),
        p_description: String(formData.get("description") || ""),
        p_city: String(formData.get("city") || ""),
        p_state: String(formData.get("state") || ""),
        p_shipping_available: formData.get("shipping_available") === "on",
      },
    );

    if (createError) {
      setError(createError.message || "Não foi possível criar o leilão.");
      submittingRef.current = false;
      setCreating(false);
      return;
    }

    setMessage("Leilão publicado com sucesso.");
    setShowCreateForm(false);
    formElement.reset();
    submittingRef.current = false;
    setCreating(false);
    router.refresh();
  }

  async function handleCancelAuction(auction: MarketplaceAuction) {
    if (cancellingId) {
      return;
    }

    if (
      !window.confirm(
        "Deseja cancelar este leilão? Essa ação não poderá ser desfeita.",
      )
    ) {
      return;
    }

    setCancellingId(auction.auction_id);
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
      setCancellingId(null);
      return;
    }

    const updateAuction = (item: MarketplaceAuction) =>
      item.auction_id === auction.auction_id
        ? { ...item, auction_status: "cancelled" }
        : item;

    setAllAuctions((current) => current.map(updateAuction));
    setMyAuctions((current) => current.map(updateAuction));
    setBidAuctions((current) => current.map(updateAuction));
    setMessage("Leilão cancelado.");
    setCancellingId(null);
  }

  return (
    <div>
      <section className="rounded-2xl border border-white/10 bg-[#13131d] p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-black">Central de leilões</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Dispute cartas, acompanhe seus lances e publique seus leilões.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => changeTab("all")}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                currentTab === "all"
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Explorar
            </button>

            <button
              type="button"
              onClick={() => changeTab("bids")}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                currentTab === "bids"
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Meus lances
            </button>

            <button
              type="button"
              onClick={() => changeTab("mine")}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                currentTab === "mine"
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Meus leilões
            </button>
          </div>
        </div>

        {currentTab === "mine" && (
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500"
          >
            {showCreateForm ? "Fechar formulário" : "Criar novo leilão"}
          </button>
        )}
      </section>

      {message && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
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

      {currentTab === "mine" && showCreateForm && (
        <form
          onSubmit={handleCreateAuction}
          className="mt-6 rounded-2xl border border-violet-500/20 bg-[#13131d] p-6 sm:p-8"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
              Novo leilão
            </p>
            <h3 className="mt-2 text-2xl font-black">
              Coloque uma carta em disputa
            </h3>
          </div>

          {collectionCards.length === 0 ? (
            <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-yellow-100">
              Você precisa adicionar uma carta à sua coleção antes de criar um
              leilão.
              <div>
                <Link
                  href="/collection/scan"
                  className="mt-4 inline-flex font-bold text-yellow-200 underline"
                >
                  Adicionar carta
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="auction-card"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Carta
                  </label>

                  <select
                    id="auction-card"
                    value={selectedCardId}
                    onChange={(event) => setSelectedCardId(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d0d16] px-4 py-3 outline-none focus:border-violet-500"
                  >
                    {collectionCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.card_name || "Carta sem nome"} — {card.quantity}{" "}
                        disponível
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="auction-quantity"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Quantidade
                  </label>

                  <input
                    id="auction-quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    max={selectedCard?.quantity || 1}
                    defaultValue={1}
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label
                    htmlFor="auction-title"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Título do leilão
                  </label>

                  <input
                    id="auction-title"
                    name="title"
                    type="text"
                    minLength={3}
                    maxLength={150}
                    placeholder="Ex.: Pikachu raro em ótimo estado"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="starting-price"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Lance inicial
                  </label>

                  <input
                    id="starting-price"
                    name="starting_price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="10,00"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="minimum-increment"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Incremento mínimo
                  </label>

                  <input
                    id="minimum-increment"
                    name="minimum_increment"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue="1.00"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ends-at"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Encerramento
                  </label>

                  <input
                    id="ends-at"
                    name="ends_at"
                    type="datetime-local"
                    defaultValue={getDefaultEndDate()}
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <div>
                    <label
                      htmlFor="auction-city"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Cidade
                    </label>

                    <input
                      id="auction-city"
                      name="city"
                      type="text"
                      maxLength={120}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auction-state"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Estado
                    </label>

                    <input
                      id="auction-state"
                      name="state"
                      type="text"
                      maxLength={2}
                      placeholder="SP"
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 uppercase outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label
                    htmlFor="auction-description"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Descrição
                  </label>

                  <textarea
                    id="auction-description"
                    name="description"
                    rows={4}
                    maxLength={2000}
                    placeholder="Descreva o estado da carta e outras informações importantes."
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 p-4">
                <input
                  name="shipping_available"
                  type="checkbox"
                  className="h-4 w-4 accent-violet-600"
                />
                <span className="text-sm font-semibold">
                  Posso enviar esta carta
                </span>
              </label>

              <button
                type="submit"
                disabled={creating}
                className="mt-6 w-full rounded-xl bg-violet-600 px-5 py-4 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {creating ? "Publicando..." : "Publicar leilão"}
              </button>
            </>
          )}
        </form>
      )}

      {visibleAuctions.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-12 text-center text-zinc-400">
          {currentTab === "all" && "Nenhum leilão disponível no momento."}
          {currentTab === "bids" &&
            "Você ainda não participou de nenhum leilão."}
          {currentTab === "mine" && "Você ainda não criou nenhum leilão."}
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleAuctions.map((auction) => {
            const cancelling = cancellingId === auction.auction_id;

            return (
              <article
                key={auction.auction_id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#13131d]"
              >
                <div className="aspect-[4/3] bg-black/30">
                  {auction.front_image_url ? (
                    <img
                      src={auction.front_image_url}
                      alt={auction.card_name}
                      className="h-full w-full object-contain p-4"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                      Imagem não disponível
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-200">
                      Leilão
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        statusStyles[auction.auction_status] ||
                        statusStyles.draft
                      }`}
                    >
                      {statusLabels[auction.auction_status] ||
                        auction.auction_status}
                    </span>
                  </div>

                  <h3 className="mt-4 break-words text-xl font-black">
                    {auction.title}
                  </h3>

                  <p className="mt-2 font-semibold">{auction.card_name}</p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {auction.set_name || "Coleção não informada"}
                    {auction.card_number ? ` · ${auction.card_number}` : ""}
                  </p>

                  <div className="mt-5 rounded-xl bg-violet-500/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
                      {auction.bid_count > 0 ? "Maior lance" : "Lance inicial"}
                    </p>

                    <p className="mt-1 text-2xl font-black text-white">
                      {formatCurrency(auction.current_price)}
                    </p>

                    <p className="mt-2 text-xs text-zinc-400">
                      {auction.bid_count}{" "}
                      {auction.bid_count === 1 ? "lance" : "lances"}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-yellow-200">
                      {getTimeDescription(
                        auction.ends_at,
                        auction.auction_status,
                      )}
                    </span>

                    {auction.is_highest_bidder && (
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">
                        Você está vencendo
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-zinc-500">
                    Encerra em {formatDate(auction.ends_at)}
                  </p>

                  <Link
                    href={`/auctions/${auction.auction_id}`}
                    className="mt-5 block w-full rounded-xl bg-violet-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-violet-500"
                  >
                    Ver leilão
                  </Link>

                  {currentTab === "mine" &&
                    auction.auction_status === "active" &&
                    auction.bid_count === 0 && (
                      <button
                        type="button"
                        disabled={cancelling}
                        onClick={() => handleCancelAuction(auction)}
                        className="mt-3 w-full rounded-xl border border-red-500/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {cancelling ? "Cancelando..." : "Cancelar leilão"}
                      </button>
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
