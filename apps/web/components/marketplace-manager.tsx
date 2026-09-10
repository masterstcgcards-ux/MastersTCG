"use client";
import Link from "next/link";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

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
  "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-violet-500";

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
  active: "bg-green-500/15 text-green-300",
  paused: "bg-yellow-500/15 text-yellow-200",
  reserved: "bg-blue-500/15 text-blue-200",
  sold: "bg-violet-500/15 text-violet-200",
  traded: "bg-violet-500/15 text-violet-200",
  cancelled: "bg-zinc-500/15 text-zinc-400",
  draft: "bg-zinc-500/15 text-zinc-300",
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
    <div className="space-y-8">
      <section className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              Sua vitrine no universo TCG
            </p>

            <h2 className="mt-2 text-2xl font-black">Anuncie uma carta</h2>

            <p className="mt-2 max-w-2xl text-sm text-zinc-300">
              Escolha uma carta da sua coleção e publique para venda ou troca.
              Os leilões serão ativados em uma próxima etapa.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setError("");
              setMessage("");
            }}
            className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500"
          >
            {showForm ? "Fechar formulário" : "Criar anúncio"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mt-7 border-t border-white/10 pt-7"
          >
            <fieldset
              disabled={saving}
              className="grid min-w-0 gap-6 disabled:opacity-60 lg:grid-cols-2"
            >
              <div className="space-y-5">
                <div>
                  <label htmlFor="marketplace-card" className="font-semibold">
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
                    <p className="mt-2 text-sm text-yellow-200">
                      Cadastre uma carta na sua coleção antes de criar um
                      anúncio.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setListingType("sale")}
                    className={`rounded-xl border px-4 py-3 font-bold ${
                      listingType === "sale"
                        ? "border-violet-400 bg-violet-500/20 text-white"
                        : "border-white/10 text-zinc-400"
                    }`}
                  >
                    Venda
                  </button>

                  <button
                    type="button"
                    onClick={() => setListingType("trade")}
                    className={`rounded-xl border px-4 py-3 font-bold ${
                      listingType === "trade"
                        ? "border-violet-400 bg-violet-500/20 text-white"
                        : "border-white/10 text-zinc-400"
                    }`}
                  >
                    Troca
                  </button>
                </div>

                <div>
                  <label htmlFor="listing-title" className="font-semibold">
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
                    <label htmlFor="listing-quantity" className="font-semibold">
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
                      <label htmlFor="listing-price" className="font-semibold">
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
                      className="font-semibold"
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
                <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/20 p-5">
                  {selectedCard?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedCard.image_url}
                      alt={selectedCard.card_name || "Carta selecionada"}
                      className="max-h-80 max-w-full rounded-xl object-contain"
                    />
                  ) : (
                    <p className="text-center text-sm text-zinc-500">
                      A imagem da carta selecionada aparecerá aqui.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="listing-description"
                    className="font-semibold"
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
                    <label htmlFor="listing-city" className="font-semibold">
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
                    <label htmlFor="listing-state" className="font-semibold">
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

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 p-4">
                  <input
                    name="shipping_available"
                    type="checkbox"
                    className="h-4 w-4 accent-violet-600"
                  />

                  <span className="text-sm">
                    Posso enviar a carta para outras cidades
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={saving || cards.length === 0}
                  className="w-full rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
        >
          {error}
        </div>
      )}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="text-2xl font-black">
              {currentTab === "marketplace"
                ? "Cartas anunciadas"
                : "Meus anúncios"}
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              {currentTab === "marketplace"
                ? "Explore as cartas anunciadas por outros Masters."
                : "Pause, reative ou encerre seus anúncios."}
            </p>
          </div>

          <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setCurrentTab("marketplace")}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                currentTab === "marketplace"
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400"
              }`}
            >
              Marketplace
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("mine")}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                currentTab === "mine"
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400"
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
            className="rounded-xl border border-white/10 bg-[#11111b] px-4 py-3 outline-none placeholder:text-zinc-600 focus:border-violet-500"
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#11111b] px-4 py-3 outline-none focus:border-violet-500"
          >
            <option value="all">Todos os anúncios</option>
            <option value="sale">Somente vendas</option>
            <option value="trade">Somente trocas</option>
          </select>
        </div>

        {displayedListings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center text-zinc-400">
            {currentTab === "marketplace"
              ? "Nenhum anúncio encontrado."
              : "Você ainda não possui anúncios."}
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {displayedListings.map((listing) => {
              const updating = updatingId === listing.listing_id;

              return (
                <article
                  key={listing.listing_id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#13131d]"
                >
                  <div className="flex min-h-72 items-center justify-center bg-black/20 p-5">
                    {listing.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.image_url}
                        alt={listing.card_name}
                        className="max-h-72 max-w-full rounded-xl object-contain"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-violet-600/20 text-3xl font-black text-violet-300">
                        M
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-200">
                        {typeLabels[listing.listing_type] ||
                          listing.listing_type}
                      </span>

                      {currentTab === "mine" && (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            statusStyles[listing.listing_status] ||
                            statusStyles.draft
                          }`}
                        >
                          {statusLabels[listing.listing_status] ||
                            listing.listing_status}
                        </span>
                      )}

                      {listing.is_own && currentTab === "marketplace" && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">
                          Seu anúncio
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 break-words text-xl font-black">
                      {listing.title}
                    </h3>

                    <p className="mt-2 font-semibold text-zinc-200">
                      {listing.card_name}
                    </p>

                    {(listing.set_name || listing.card_number) && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {[listing.set_name, listing.card_number]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    )}

                    {listing.listing_type === "sale" &&
                      listing.price !== null && (
                        <p className="mt-4 text-2xl font-black text-green-300">
                          {formatPrice(listing.price)}
                        </p>
                      )}

                    {listing.listing_type === "trade" && (
                      <div className="mt-4 rounded-xl bg-violet-500/10 p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
                          Procura na troca
                        </p>
                        <p className="mt-2 break-words text-sm text-zinc-300">
                          {listing.trade_preferences ||
                            "Vendedor aberto a propostas."}
                        </p>
                      </div>
                    )}

                    {listing.description && (
                      <p className="mt-4 whitespace-pre-wrap break-words text-sm text-zinc-400">
                        {listing.description}
                      </p>
                    )}

                    <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
                      <div>
                        <dt className="text-zinc-500">Quantidade</dt>
                        <dd className="mt-1 font-semibold">
                          {listing.quantity}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-zinc-500">Vendedor</dt>
                        <dd className="mt-1 truncate font-semibold">
                          {listing.seller_display_name}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-zinc-500">Localização</dt>
                        <dd className="mt-1 font-semibold">
                          {[listing.city, listing.state]
                            .filter(Boolean)
                            .join(" - ") || "Não informada"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-zinc-500">Envio</dt>
                        <dd className="mt-1 font-semibold">
                          {listing.shipping_available
                            ? "Disponível"
                            : "A combinar"}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-4 text-xs text-zinc-600">
                      Publicado em {formatDate(listing.created_at)}
                    </p>
                    {currentTab === "marketplace" &&
                      listing.listing_type === "sale" &&
                      !listing.is_own && (
                        <Link
                          href={`/marketplace/${listing.listing_id}/buy`}
                          className="mt-5 block w-full rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-emerald-500"
                        >
                          Comprar
                        </Link>
                      )}

                    {currentTab === "marketplace" &&
                      listing.listing_type === "trade" &&
                      !listing.is_own && (
                        <Link
                          href={`/marketplace/${listing.listing_id}/offer`}
                          className="mt-5 block w-full rounded-xl bg-violet-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-violet-500"
                        >
                          Fazer proposta
                        </Link>
                      )}
                    {currentTab === "mine" && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {listing.listing_status === "active" && (
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() =>
                              handleStatusChange(listing.listing_id, "paused")
                            }
                            className="rounded-lg border border-yellow-500/30 px-4 py-2 text-sm font-bold text-yellow-200 hover:bg-yellow-500/10 disabled:opacity-50"
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
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"
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
                            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Encerrar
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => handleDelete(listing.listing_id)}
                          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-zinc-400 hover:bg-white/5 disabled:opacity-50"
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
