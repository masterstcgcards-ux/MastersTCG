"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";

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
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ended: "border-blue-200 bg-blue-50 text-blue-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

const inputClass =
  "w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const labelClass = "mb-2 block text-sm font-bold text-[#071a4c]";

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
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">
              Área de disputas
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#071a4c]">
              Central de leilões
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Dispute cartas, acompanhe seus lances e publique seus leilões.
            </p>
          </div>

          <div className="grid grid-cols-3 rounded-2xl border border-blue-100 bg-blue-50 p-1">
            <button
              type="button"
              onClick={() => changeTab("all")}
              className={`rounded-xl px-3 py-3 text-xs font-bold transition sm:px-4 sm:text-sm ${
                currentTab === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-blue-700"
              }`}
            >
              Explorar
            </button>

            <button
              type="button"
              onClick={() => changeTab("bids")}
              className={`rounded-xl px-3 py-3 text-xs font-bold transition sm:px-4 sm:text-sm ${
                currentTab === "bids"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-blue-700"
              }`}
            >
              Meus lances
            </button>

            <button
              type="button"
              onClick={() => changeTab("mine")}
              className={`rounded-xl px-3 py-3 text-xs font-bold transition sm:px-4 sm:text-sm ${
                currentTab === "mine"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-blue-700"
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
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            {showCreateForm ? "Fechar formulário" : "Criar novo leilão"}
          </button>
        )}
      </section>

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

      {currentTab === "mine" && showCreateForm && (
        <form
          onSubmit={handleCreateAuction}
          className="mt-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"
        >
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
              Novo leilão
            </p>

            <h3 className="mt-2 text-2xl font-black text-[#071a4c]">
              Coloque uma carta em disputa
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Escolha uma carta, defina os valores e determine quando o leilão
              será encerrado.
            </p>
          </div>

          <div className="p-5 sm:p-8">
            {collectionCards.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <p className="font-semibold">
                  Você precisa adicionar uma carta à sua coleção antes de criar
                  um leilão.
                </p>

                <Link
                  href="/collection/scan"
                  className="mt-4 inline-flex rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-[#071a4c] transition hover:bg-amber-300"
                >
                  Adicionar carta
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div>
                    <div className="flex aspect-[2.5/3.5] items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-4">
                      {selectedCard?.front_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedCard.front_image_url}
                          alt={selectedCard.card_name || "Carta selecionada"}
                          className="h-full w-full object-contain drop-shadow-lg"
                        />
                      ) : (
                        <span className="px-4 text-center text-sm text-slate-400">
                          Imagem não disponível
                        </span>
                      )}
                    </div>

                    {selectedCard && (
                      <div className="mt-3 text-center">
                        <p className="font-bold text-[#071a4c]">
                          {selectedCard.card_name || "Carta sem nome"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {selectedCard.quantity}{" "}
                          {selectedCard.quantity === 1
                            ? "unidade disponível"
                            : "unidades disponíveis"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <label htmlFor="auction-card" className={labelClass}>
                        Carta
                      </label>

                      <select
                        id="auction-card"
                        value={selectedCardId}
                        onChange={(event) =>
                          setSelectedCardId(event.target.value)
                        }
                        className={inputClass}
                      >
                        {collectionCards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.card_name || "Carta sem nome"} —{" "}
                            {card.quantity} disponível
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="auction-quantity" className={labelClass}>
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
                        className={inputClass}
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label htmlFor="auction-title" className={labelClass}>
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
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="starting-price" className={labelClass}>
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
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="minimum-increment" className={labelClass}>
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
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="ends-at" className={labelClass}>
                        Encerramento
                      </label>

                      <input
                        id="ends-at"
                        name="ends_at"
                        type="datetime-local"
                        defaultValue={getDefaultEndDate()}
                        required
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-[1fr_90px] gap-3">
                      <div>
                        <label htmlFor="auction-city" className={labelClass}>
                          Cidade
                        </label>

                        <input
                          id="auction-city"
                          name="city"
                          type="text"
                          maxLength={120}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label htmlFor="auction-state" className={labelClass}>
                          Estado
                        </label>

                        <input
                          id="auction-state"
                          name="state"
                          type="text"
                          maxLength={2}
                          placeholder="SP"
                          className={`${inputClass} uppercase`}
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <label
                        htmlFor="auction-description"
                        className={labelClass}
                      >
                        Descrição
                      </label>

                      <textarea
                        id="auction-description"
                        name="description"
                        rows={4}
                        maxLength={2000}
                        placeholder="Descreva o estado da carta e outras informações importantes."
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </div>
                </div>

                <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <input
                    name="shipping_available"
                    type="checkbox"
                    className="h-5 w-5 accent-blue-600"
                  />

                  <span>
                    <span className="block text-sm font-bold text-[#071a4c]">
                      Posso enviar esta carta
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      Marque esta opção caso aceite combinar o envio com o
                      vencedor.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={creating}
                  className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? "Publicando..." : "Publicar leilão"}
                </button>
              </>
            )}
          </div>
        </form>
      )}

      {visibleAuctions.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600">
            ◇
          </div>

          <h3 className="mt-5 text-xl font-black text-[#071a4c]">
            Nenhum leilão encontrado
          </h3>

          <p className="mt-2 text-slate-600">
            {currentTab === "all" && "Nenhum leilão disponível no momento."}
            {currentTab === "bids" &&
              "Você ainda não participou de nenhum leilão."}
            {currentTab === "mine" && "Você ainda não criou nenhum leilão."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
          {visibleAuctions.map((auction) => {
            const cancelling = cancellingId === auction.auction_id;

            return (
              <article
                key={auction.auction_id}
                className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg sm:rounded-3xl"
              >
                <div className="flex aspect-[2.5/3.5] items-center justify-center overflow-hidden border-b border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-2 sm:p-5">
                  {auction.front_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={auction.front_image_url}
                      alt={auction.card_name}
                      className="h-full w-full rounded-lg object-contain drop-shadow-lg transition duration-300 hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-slate-400 sm:text-sm">
                      Imagem não disponível
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-5">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 sm:px-3 sm:text-xs">
                      Leilão
                    </span>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${
                        statusStyles[auction.auction_status] ||
                        statusStyles.draft
                      }`}
                    >
                      {statusLabels[auction.auction_status] ||
                        auction.auction_status}
                    </span>
                  </div>

                  <h3 className="mt-3 break-words text-sm font-black leading-tight text-[#071a4c] sm:mt-4 sm:text-xl">
                    {auction.title}
                  </h3>

                  <p className="mt-2 text-xs font-bold text-slate-800 sm:text-base">
                    {auction.card_name}
                  </p>

                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 sm:text-sm">
                    {auction.set_name || "Coleção não informada"}
                    {auction.card_number ? ` · ${auction.card_number}` : ""}
                  </p>

                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:mt-5 sm:p-4">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600 sm:text-xs">
                      {auction.bid_count > 0 ? "Maior lance" : "Lance inicial"}
                    </p>

                    <p className="mt-1 break-words text-lg font-black text-blue-700 sm:text-2xl">
                      {formatCurrency(auction.current_price)}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-500 sm:mt-2 sm:text-xs">
                      {auction.bid_count}{" "}
                      {auction.bid_count === 1 ? "lance" : "lances"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col items-start gap-2 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[11px] font-bold text-amber-700 sm:text-sm">
                      {getTimeDescription(
                        auction.ends_at,
                        auction.auction_status,
                      )}
                    </span>

                    {auction.is_highest_bidder && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-700 sm:px-3 sm:text-xs">
                        Você está vencendo
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-[10px] text-slate-400 sm:text-xs">
                    Encerra em {formatDate(auction.ends_at)}
                  </p>

                  <Link
                    href={`/auctions/${auction.auction_id}`}
                    className="mt-4 block w-full rounded-xl bg-blue-600 px-2 py-3 text-center text-xs font-bold text-white transition hover:bg-blue-700 sm:mt-5 sm:px-5 sm:text-sm"
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
                        className="mt-2 w-full rounded-xl border border-red-200 bg-white px-2 py-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-3 sm:px-5 sm:text-sm"
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
