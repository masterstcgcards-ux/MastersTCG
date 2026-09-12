"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { ReportForm } from "@/components/report-form";
import { createClient } from "@/lib/supabase/client";

export type MarketplaceCard = {
  id: string;
  card_name: string | null;
  set_name: string | null;
  card_number: string | null;
  quantity: number;
  front_image_path: string | null;
  image_url: string | null;
};

export type MarketplaceListing = {
  listing_id: string;
  seller_id: string;
  seller_display_name: string;
  seller_username: string | null;
  is_own: boolean;
  user_card_id: string;
  listing_type: string;
  title: string;
  description: string | null;
  quantity: number;
  price: number | null;
  trade_preferences: string | null;
  city: string | null;
  state: string | null;
  shipping_available: boolean;
  listing_status: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  front_image_path: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

type MarketplaceManagerProps = {
  userId: string;
  cards: MarketplaceCard[];
  initialActiveListings: MarketplaceListing[];
  initialOwnListings: MarketplaceListing[];
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-[#071a4c] outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

const typeLabels: Record<string, string> = {
  sale: "Venda",
  trade: "Troca",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  reserved: "Reservado",
  sold: "Vendido",
  traded: "Trocado",
  cancelled: "Encerrado",
};

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-800",
  reserved: "bg-blue-100 text-blue-700",
  sold: "bg-indigo-100 text-indigo-700",
  traded: "bg-indigo-100 text-indigo-700",
  cancelled: "bg-slate-100 text-slate-600",
  draft: "bg-slate-100 text-slate-600",
};

function formatPrice(value: number | null) {
  if (value === null) return null;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function normalizeListing(
  listing: Omit<MarketplaceListing, "image_url">,
  imageUrls: Map<string, string>,
): MarketplaceListing {
  return {
    ...listing,
    image_url: listing.front_image_path
      ? imageUrls.get(listing.front_image_path) || null
      : null,
  };
}

export function MarketplaceManager({
  userId,
  cards,
  initialActiveListings,
  initialOwnListings,
}: MarketplaceManagerProps) {
  const submitting = useRef(false);

  const [activeListings, setActiveListings] = useState(initialActiveListings);
  const [ownListings, setOwnListings] = useState(initialOwnListings);
  const [currentTab, setCurrentTab] = useState<"marketplace" | "mine">(
    "marketplace",
  );
  const [showForm, setShowForm] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [listingType, setListingType] = useState<"sale" | "trade">("sale");
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setActiveListings(initialActiveListings);
  }, [initialActiveListings]);

  useEffect(() => {
    setOwnListings(initialOwnListings);
  }, [initialOwnListings]);

  const selectedCard = cards.find((card) => card.id === selectedCardId) || null;

  const displayedListings = useMemo(() => {
    const source = currentTab === "marketplace" ? activeListings : ownListings;
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    return source.filter((listing) => {
      if (typeFilter !== "all" && listing.listing_type !== typeFilter) {
        return false;
      }

      if (!normalizedSearch) return true;

      const searchableText = [
        listing.title,
        listing.card_name,
        listing.set_name,
        listing.card_number,
        listing.seller_display_name,
        listing.city,
        listing.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return searchableText.includes(normalizedSearch);
    });
  }, [activeListings, currentTab, ownListings, search, typeFilter]);

  async function refreshListings() {
    const supabase = createClient();

    const [activeResult, mineResult] = await Promise.all([
      supabase.rpc("get_marketplace_listings", {
        p_scope: "active",
      }),
      supabase.rpc("get_marketplace_listings", {
        p_scope: "mine",
      }),
    ]);

    if (activeResult.error) throw activeResult.error;
    if (mineResult.error) throw mineResult.error;

    const activeRows = Array.isArray(activeResult.data)
      ? (activeResult.data as Omit<MarketplaceListing, "image_url">[])
      : [];

    const mineRows = Array.isArray(mineResult.data)
      ? (mineResult.data as Omit<MarketplaceListing, "image_url">[])
      : [];

    const imagePaths = Array.from(
      new Set(
        [...activeRows, ...mineRows]
          .map((listing) => listing.front_image_path)
          .filter((path): path is string => Boolean(path)),
      ),
    );

    const imageUrls = new Map<string, string>();

    await Promise.all(
      imagePaths.map(async (path) => {
        const { data } = await supabase.storage
          .from("card-scans")
          .createSignedUrl(path, 60 * 60);

        if (data?.signedUrl) {
          imageUrls.set(path, data.signedUrl);
        }
      }),
    );

    setActiveListings(
      activeRows.map((listing) => normalizeListing(listing, imageUrls)),
    );

    setOwnListings(
      mineRows.map((listing) => normalizeListing(listing, imageUrls)),
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || submitting.current) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const card = cards.find((item) => item.id === selectedCardId);

    setError("");
    setMessage("");

    if (!card) {
      setError("Selecione uma carta da sua coleção.");
      return;
    }

    const quantity = Number(form.get("quantity"));
    const priceText = String(form.get("price") || "")
      .trim()
      .replace(",", ".");
    const price = priceText ? Number(priceText) : null;

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > card.quantity
    ) {
      setError(`A quantidade deve estar entre 1 e ${card.quantity}.`);
      return;
    }

    if (
      listingType === "sale" &&
      (price === null || !Number.isFinite(price) || price <= 0)
    ) {
      setError("Informe um preço válido para o anúncio de venda.");
      return;
    }

    submitting.current = true;
    setSaving(true);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase
        .from("marketplace_listings")
        .insert({
          seller_id: userId,
          user_card_id: card.id,
          listing_type: listingType,
          title: title.trim(),
          description: String(form.get("description") || "").trim() || null,
          quantity,
          price: listingType === "sale" ? price : null,
          trade_preferences:
            listingType === "trade"
              ? String(form.get("trade_preferences") || "").trim() || null
              : null,
          city: String(form.get("city") || "").trim() || null,
          state: String(form.get("state") || "").trim() || null,
          shipping_available: form.get("shipping_available") === "on",
          status: "active",
        });

      if (insertError) throw insertError;

      await refreshListings();

      formElement.reset();
      setSelectedCardId("");
      setListingType("sale");
      setTitle("");
      setShowForm(false);
      setCurrentTab("mine");
      setMessage("Anúncio publicado com sucesso!");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível publicar o anúncio.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  async function handleStatusChange(
    listingId: string,
    newStatus: "active" | "paused" | "cancelled",
  ) {
    if (updatingId) return;

    setUpdatingId(listingId);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("marketplace_listings")
        .update({ status: newStatus })
        .eq("id", listingId)
        .eq("seller_id", userId);

      if (updateError) throw updateError;

      await refreshListings();

      setMessage(
        newStatus === "active"
          ? "Anúncio ativado."
          : newStatus === "paused"
            ? "Anúncio pausado."
            : "Anúncio encerrado.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível atualizar o anúncio.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(listingId: string) {
    const confirmed = window.confirm(
      "Deseja excluir definitivamente este anúncio?",
    );

    if (!confirmed || updatingId) return;

    setUpdatingId(listingId);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from("marketplace_listings")
        .delete()
        .eq("id", listingId)
        .eq("seller_id", userId);

      if (deleteError) throw deleteError;

      await refreshListings();
      setMessage("Anúncio excluído.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível excluir o anúncio.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl border border-blue-200 bg-blue-50">
        <div className="flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
              Sua vitrine no universo TCG
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#071a4c]">
              Anuncie uma carta
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Escolha uma carta da sua coleção e publique para venda ou troca.
              Para criar um leilão, acesse a área de leilões.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setError("");
              setMessage("");
            }}
            className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-blue-800"
          >
            {showForm ? "Fechar formulário" : "Criar anúncio"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="border-t border-blue-200 bg-white p-6 sm:p-8"
          >
            <fieldset
              disabled={saving}
              className="grid min-w-0 gap-8 disabled:opacity-60 lg:grid-cols-2"
            >
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="marketplace-card"
                    className="font-semibold text-[#071a4c]"
                  >
                    Carta da coleção *
                  </label>

                  <select
                    id="marketplace-card"
                    required
                    value={selectedCardId}
                    onChange={(event) => {
                      const cardId = event.target.value;
                      const card = cards.find((item) => item.id === cardId);

                      setSelectedCardId(cardId);

                      if (card && !title.trim()) {
                        setTitle(card.card_name || "Carta Pokémon");
                      }
                    }}
                    className={fieldClass}
                  >
                    <option value="">Selecione uma carta</option>

                    {cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.card_name || "Carta sem nome"}
                        {card.set_name ? ` — ${card.set_name}` : ""}
                        {` — ${card.quantity} disponível(is)`}
                      </option>
                    ))}
                  </select>

                  {cards.length === 0 && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Cadastre uma carta na sua coleção antes de criar um
                      anúncio.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setListingType("sale")}
                    className={`rounded-xl border px-4 py-3 font-bold transition ${
                      listingType === "sale"
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-blue-200 bg-white text-slate-600 hover:border-blue-400"
                    }`}
                  >
                    Venda
                  </button>

                  <button
                    type="button"
                    onClick={() => setListingType("trade")}
                    className={`rounded-xl border px-4 py-3 font-bold transition ${
                      listingType === "trade"
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-blue-200 bg-white text-slate-600 hover:border-blue-400"
                    }`}
                  >
                    Troca
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="listing-title"
                    className="font-semibold text-[#071a4c]"
                  >
                    Título do anúncio *
                  </label>

                  <input
                    id="listing-title"
                    name="title"
                    required
                    minLength={3}
                    maxLength={150}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex.: Pikachu em excelente estado"
                    className={fieldClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="listing-quantity"
                      className="font-semibold text-[#071a4c]"
                    >
                      Quantidade *
                    </label>

                    <input
                      id="listing-quantity"
                      name="quantity"
                      type="number"
                      min={1}
                      max={selectedCard?.quantity || 1}
                      defaultValue={1}
                      required
                      className={fieldClass}
                    />
                  </div>

                  {listingType === "sale" && (
                    <div>
                      <label
                        htmlFor="listing-price"
                        className="font-semibold text-[#071a4c]"
                      >
                        Preço *
                      </label>

                      <input
                        id="listing-price"
                        name="price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        placeholder="0,00"
                        className={fieldClass}
                      />
                    </div>
                  )}
                </div>

                {listingType === "trade" && (
                  <div>
                    <label
                      htmlFor="trade-preferences"
                      className="font-semibold text-[#071a4c]"
                    >
                      O que aceita na troca?
                    </label>

                    <textarea
                      id="trade-preferences"
                      name="trade_preferences"
                      maxLength={1000}
                      rows={4}
                      placeholder="Ex.: Procuro cartas da coleção 151..."
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="flex justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5">
                  <div className="flex aspect-[2.5/3.5] w-full max-w-[250px] items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
                    {selectedCard?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedCard.image_url}
                        alt={selectedCard.card_name || "Carta selecionada"}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="px-4 text-center">
                        <div className="mx-auto flex h-16 w-12 items-center justify-center rounded-lg bg-blue-100 text-xl font-black text-blue-700">
                          M
                        </div>

                        <p className="mt-4 text-sm text-slate-500">
                          A imagem da carta selecionada aparecerá aqui.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="listing-description"
                    className="font-semibold text-[#071a4c]"
                  >
                    Descrição
                  </label>

                  <textarea
                    id="listing-description"
                    name="description"
                    maxLength={2000}
                    rows={4}
                    placeholder="Descreva o estado e outras informações da carta."
                    className={fieldClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="listing-city"
                      className="font-semibold text-[#071a4c]"
                    >
                      Cidade
                    </label>

                    <input
                      id="listing-city"
                      name="city"
                      maxLength={120}
                      placeholder="Sua cidade"
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="listing-state"
                      className="font-semibold text-[#071a4c]"
                    >
                      Estado
                    </label>

                    <input
                      id="listing-state"
                      name="state"
                      minLength={2}
                      maxLength={2}
                      placeholder="SP"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-slate-700">
                  <input
                    name="shipping_available"
                    type="checkbox"
                    className="h-5 w-5 accent-blue-700"
                  />

                  <span className="text-sm font-medium">
                    Posso enviar a carta para outras cidades
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={saving || cards.length === 0}
                  className="w-full rounded-xl bg-yellow-400 px-6 py-4 font-black text-[#071a4c] shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Publicando..." : "Publicar anúncio"}
                </button>
              </div>
            </fieldset>
          </form>
        )}
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

      <section>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
              Cartas de colecionadores
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#071a4c]">
              {currentTab === "marketplace"
                ? "Cartas anunciadas"
                : "Meus anúncios"}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {currentTab === "marketplace"
                ? "Explore as cartas anunciadas por outros Masters."
                : "Pause, reative ou encerre seus anúncios."}
            </p>
          </div>

          <div className="flex rounded-xl border border-blue-200 bg-blue-50 p-1">
            <button
              type="button"
              onClick={() => setCurrentTab("marketplace")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                currentTab === "marketplace"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-blue-700"
              }`}
            >
              Marketplace
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("mine")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                currentTab === "mine"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-blue-700"
              }`}
            >
              Meus anúncios
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_220px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar carta, coleção, vendedor ou cidade..."
            className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-[#071a4c] outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-[#071a4c] outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">Todos os anúncios</option>
            <option value="sale">Somente vendas</option>
            <option value="trade">Somente trocas</option>
          </select>
        </div>

        {displayedListings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-10 text-center text-slate-500">
            {currentTab === "marketplace"
              ? "Nenhum anúncio encontrado."
              : "Você ainda não possui anúncios."}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
            {displayedListings.map((listing) => {
              const updating = updatingId === listing.listing_id;

              return (
                <article
                  key={listing.listing_id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
                >
                  <div className="flex aspect-[2.5/3.5] items-center justify-center bg-gradient-to-b from-blue-50 to-white p-2 sm:p-5">
                    {listing.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.image_url}
                        alt={listing.card_name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-24 w-16 flex-col items-center justify-center rounded-xl border-2 border-blue-200 bg-blue-700 text-white shadow-md">
                        <span className="text-3xl font-black">M</span>
                        <span className="mt-1 text-[8px] font-bold tracking-widest text-yellow-300">
                          TCG
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 sm:text-xs">
                        {typeLabels[listing.listing_type] ||
                          listing.listing_type}
                      </span>

                      {currentTab === "mine" && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold sm:text-xs ${
                            statusStyles[listing.listing_status] ||
                            statusStyles.draft
                          }`}
                        >
                          {statusLabels[listing.listing_status] ||
                            listing.listing_status}
                        </span>
                      )}

                      {listing.is_own && currentTab === "marketplace" && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 sm:text-xs">
                          Seu anúncio
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 break-words text-base font-black leading-tight text-[#071a4c] sm:mt-4 sm:text-xl">
                      {listing.title}
                    </h3>

                    <p className="mt-2 break-words text-sm font-semibold text-slate-700">
                      {listing.card_name}
                    </p>

                    {(listing.set_name || listing.card_number) && (
                      <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">
                        {[listing.set_name, listing.card_number]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    )}

                    {listing.listing_type === "sale" &&
                      listing.price !== null && (
                        <p className="mt-4 text-lg font-black text-emerald-600 sm:text-2xl">
                          {formatPrice(listing.price)}
                        </p>
                      )}

                    {listing.listing_type === "trade" && (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 sm:text-xs">
                          Procura na troca
                        </p>

                        <p className="mt-2 break-words text-xs text-slate-600 sm:text-sm">
                          {listing.trade_preferences ||
                            "Vendedor aberto a propostas."}
                        </p>
                      </div>
                    )}

                    {listing.description && (
                      <p className="mt-4 whitespace-pre-wrap break-words text-xs text-slate-600 sm:text-sm">
                        {listing.description}
                      </p>
                    )}

                    <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-blue-100 pt-4 text-xs sm:grid-cols-2 sm:text-sm">
                      <div>
                        <dt className="text-slate-500">Quantidade</dt>
                        <dd className="mt-1 font-semibold text-[#071a4c]">
                          {listing.quantity}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">Vendedor</dt>
                        <dd className="mt-1 truncate font-semibold text-[#071a4c]">
                          {listing.seller_display_name}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">Localização</dt>
                        <dd className="mt-1 break-words font-semibold text-[#071a4c]">
                          {[listing.city, listing.state]
                            .filter(Boolean)
                            .join(" - ") || "Não informada"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">Envio</dt>
                        <dd className="mt-1 font-semibold text-[#071a4c]">
                          {listing.shipping_available
                            ? "Disponível"
                            : "A combinar"}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-4 text-[10px] text-slate-400 sm:text-xs">
                      Publicado em {formatDate(listing.created_at)}
                    </p>

                    {!listing.is_own && (
                      <>
                        <Link
                          href={`/reputation/${listing.seller_id}`}
                          className="mt-4 inline-flex text-xs font-bold text-amber-600 hover:text-amber-700 sm:text-sm"
                        >
                          ★ Ver reputação
                        </Link>

                        <ReportForm
                          targetType="listing"
                          targetId={listing.listing_id}
                          targetLabel="anúncio"
                        />
                      </>
                    )}

                    {currentTab === "marketplace" &&
                      listing.listing_type === "sale" &&
                      !listing.is_own && (
                        <Link
                          href={`/marketplace/${listing.listing_id}/buy`}
                          className="mt-5 block w-full rounded-xl bg-emerald-600 px-3 py-3 text-center text-xs font-bold text-white transition hover:bg-emerald-700 sm:px-5 sm:text-sm"
                        >
                          Comprar
                        </Link>
                      )}

                    {currentTab === "marketplace" &&
                      listing.listing_type === "trade" &&
                      !listing.is_own && (
                        <Link
                          href={`/marketplace/${listing.listing_id}/offer`}
                          className="mt-5 block w-full rounded-xl bg-blue-700 px-3 py-3 text-center text-xs font-bold text-white transition hover:bg-blue-800 sm:px-5 sm:text-sm"
                        >
                          Fazer proposta
                        </Link>
                      )}

                    {currentTab === "mine" && (
                      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {listing.listing_status === "active" && (
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() =>
                              handleStatusChange(listing.listing_id, "paused")
                            }
                            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50 sm:px-4 sm:text-sm"
                          >
                            {updating ? "Atualizando..." : "Pausar"}
                          </button>
                        )}

                        {listing.listing_status === "paused" && (
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() =>
                              handleStatusChange(listing.listing_id, "active")
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 sm:px-4 sm:text-sm"
                          >
                            {updating ? "Atualizando..." : "Reativar"}
                          </button>
                        )}

                        {!["cancelled", "sold", "traded"].includes(
                          listing.listing_status,
                        ) && (
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() =>
                              handleStatusChange(
                                listing.listing_id,
                                "cancelled",
                              )
                            }
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 sm:px-4 sm:text-sm"
                          >
                            Encerrar
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => handleDelete(listing.listing_id)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:px-4 sm:text-sm"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
