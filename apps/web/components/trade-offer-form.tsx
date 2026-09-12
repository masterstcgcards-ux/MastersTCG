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
  front_image_url?: string | null;
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
  front_image_url?: string | null;
};

type TradeOfferFormProps = {
  listing: TradeOfferListing;
  cards: TradeOfferCard[];
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-[#071a4c] outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

export function TradeOfferForm({ listing, cards }: TradeOfferFormProps) {
  const submitting = useRef(false);

  const [selectedCardId, setSelectedCardId] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const selectedCard = cards.find((card) => card.id === selectedCardId) || null;

  const listingImageUrl = listing.image_url || listing.front_image_url || null;
  const selectedCardImageUrl =
    selectedCard?.image_url || selectedCard?.front_image_url || null;

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
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl font-black text-white">
          ✓
        </div>

        <p role="status" className="mt-5 text-2xl font-black text-emerald-800">
          {message}
        </p>

        <p className="mt-3 text-slate-600">
          O dono do anúncio poderá aceitar ou recusar sua proposta.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/offers"
            className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800"
          >
            Acompanhar propostas
          </Link>

          <Link
            href="/marketplace"
            className="rounded-xl border border-blue-200 bg-white px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-50"
          >
            Voltar ao Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <article className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
        <div className="flex justify-center bg-gradient-to-b from-blue-50 to-white p-6">
          <div className="flex aspect-[2.5/3.5] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
            {listingImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listingImageUrl}
                alt={listing.card_name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-32 w-24 flex-col items-center justify-center rounded-xl border-2 border-blue-200 bg-blue-700 text-white shadow-md">
                <span className="text-4xl font-black">M</span>
                <span className="mt-1 text-[10px] font-bold tracking-widest text-yellow-300">
                  TCG
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-blue-100 p-6">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
            Carta desejada
          </span>

          <h2 className="mt-4 break-words text-2xl font-black text-[#071a4c]">
            {listing.listing_title}
          </h2>

          <p className="mt-2 font-semibold text-slate-700">
            {listing.card_name}
          </p>

          {(listing.set_name || listing.card_number) && (
            <p className="mt-1 text-sm text-slate-500">
              {[listing.set_name, listing.card_number]
                .filter(Boolean)
                .join(" • ")}
            </p>
          )}

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              O vendedor procura
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {listing.trade_preferences ||
                "O vendedor está aberto a propostas."}
            </p>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Anunciado por{" "}
            <span className="font-semibold text-[#071a4c]">
              {listing.seller_display_name}
            </span>
            {listing.seller_username ? ` (@${listing.seller_username})` : ""}
          </p>
        </div>
      </article>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"
      >
        <fieldset disabled={saving} className="space-y-6 disabled:opacity-60">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Sua oferta
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#071a4c]">
              Escolha uma carta
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              A carta continuará na sua coleção. Nesta etapa, o MastersTCG
              registrará apenas a proposta.
            </p>
          </div>

          <div>
            <label
              htmlFor="offered-card"
              className="font-semibold text-[#071a4c]"
            >
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
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Você precisa cadastrar uma carta na coleção para enviar uma
                proposta.
              </p>
            )}
          </div>

          <div className="flex justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5">
            <div className="flex aspect-[2.5/3.5] w-full max-w-[250px] items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm">
              {selectedCardImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCardImageUrl}
                  alt={selectedCard?.card_name || "Carta oferecida"}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="px-4 text-center">
                  <div className="mx-auto flex h-20 w-14 flex-col items-center justify-center rounded-lg bg-blue-700 text-white">
                    <span className="text-2xl font-black">M</span>
                    <span className="text-[7px] font-bold tracking-wider text-yellow-300">
                      TCG
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-500">
                    A imagem da carta oferecida aparecerá aqui.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="offered-quantity"
              className="font-semibold text-[#071a4c]"
            >
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
            <label
              htmlFor="offer-message"
              className="font-semibold text-[#071a4c]"
            >
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
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || cards.length === 0}
            className="w-full rounded-xl bg-yellow-400 px-6 py-4 font-black text-[#071a4c] shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Enviando proposta..." : "Enviar proposta"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
