"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type TradeOfferCard = {
  id: string;
  card_name: string | null;
  set_name: string | null;
  card_number: string | null;
  quantity: number;
  front_image_path: string | null;
  image_url: string | null;
};

export type TradeOfferListing = {
  listing_id: string;
  seller_display_name: string;
  seller_username: string | null;
  listing_title: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  quantity: number;
  trade_preferences: string | null;
  front_image_path: string | null;
  image_url: string | null;
};

type TradeOfferFormProps = {
  listing: TradeOfferListing;
  cards: TradeOfferCard[];
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-violet-500";

export function TradeOfferForm({ listing, cards }: TradeOfferFormProps) {
  const submitting = useRef(false);

  const [selectedCardId, setSelectedCardId] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const selectedCard = cards.find((card) => card.id === selectedCardId) || null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || submitting.current) return;

    const form = new FormData(event.currentTarget);
    const quantity = Number(form.get("quantity"));
    const selectedCard = cards.find((card) => card.id === selectedCardId);

    setMessage("");

    if (!selectedCard) {
      setMessage("Selecione uma carta da sua coleção.");
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > selectedCard.quantity
    ) {
      setMessage(`A quantidade deve estar entre 1 e ${selectedCard.quantity}.`);
      return;
    }

    submitting.current = true;
    setSaving(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("create_trade_offer", {
        p_listing_id: listing.listing_id,
        p_user_card_id: selectedCard.id,
        p_quantity: quantity,
        p_message: String(form.get("message") || "").trim() || null,
      });

      if (error) throw error;

      setSuccess(true);
      setMessage("Proposta enviada com sucesso!");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a proposta.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8">
        <p role="status" className="text-xl font-black text-green-200">
          {message}
        </p>

        <p className="mt-3 text-zinc-300">
          O dono do anúncio poderá aceitar ou recusar sua proposta.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/offers"
            className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-500"
          >
            Acompanhar propostas
          </Link>

          <Link
            href="/marketplace"
            className="rounded-xl border border-white/10 px-5 py-3 font-bold text-zinc-300 hover:bg-white/5"
          >
            Voltar ao Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#13131d]">
        <div className="flex min-h-80 items-center justify-center bg-black/20 p-6">
          {listing.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.image_url}
              alt={listing.card_name}
              className="max-h-80 max-w-full rounded-xl object-contain"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-violet-600/20 text-4xl font-black text-violet-300">
              M
            </div>
          )}
        </div>

        <div className="p-6">
          <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-200">
            Carta desejada
          </span>

          <h2 className="mt-4 text-2xl font-black">{listing.listing_title}</h2>

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

          <div className="mt-5 rounded-xl bg-violet-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
              O vendedor procura
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
              {listing.trade_preferences ||
                "O vendedor está aberto a propostas."}
            </p>
          </div>

          <p className="mt-5 text-sm text-zinc-400">
            Anunciado por{" "}
            <span className="font-semibold text-white">
              {listing.seller_display_name}
            </span>
            {listing.seller_username ? ` (@${listing.seller_username})` : ""}
          </p>
        </div>
      </article>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-[#11111b] p-6"
      >
        <fieldset disabled={saving} className="space-y-6 disabled:opacity-60">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              Sua oferta
            </p>

            <h2 className="mt-2 text-2xl font-black">Escolha uma carta</h2>

            <p className="mt-2 text-sm text-zinc-400">
              A carta continuará na sua coleção. Nesta etapa, o MastersTCG
              registrará apenas a proposta.
            </p>
          </div>

          <div>
            <label htmlFor="offered-card" className="font-semibold">
              Carta oferecida *
            </label>

            <select
              id="offered-card"
              required
              value={selectedCardId}
              onChange={(event) => setSelectedCardId(event.target.value)}
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
                Você precisa cadastrar uma carta na coleção para enviar uma
                proposta.
              </p>
            )}
          </div>

          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/20 p-5">
            {selectedCard?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedCard.image_url}
                alt={selectedCard.card_name || "Carta oferecida"}
                className="max-h-72 max-w-full rounded-xl object-contain"
              />
            ) : (
              <p className="text-center text-sm text-zinc-500">
                A imagem da carta oferecida aparecerá aqui.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="offered-quantity" className="font-semibold">
              Quantidade *
            </label>

            <input
              id="offered-quantity"
              name="quantity"
              type="number"
              min={1}
              max={selectedCard?.quantity || 1}
              defaultValue={1}
              required
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="offer-message" className="font-semibold">
              Mensagem para o vendedor
            </label>

            <textarea
              id="offer-message"
              name="message"
              maxLength={1000}
              rows={5}
              placeholder="Explique sua proposta e informe detalhes importantes."
              className={fieldClass}
            />
          </div>

          {message && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || cards.length === 0}
            className="w-full rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Enviando proposta..." : "Enviar proposta"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
