"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type CollectionCard = {
  id: string;
  card_name: string | null;
  set_name: string | null;
  card_number: string | null;
  card_condition: string | null;
  quantity: number;
  imageUrl: string | null;
};

type DeckCard = {
  user_card_id: string;
  quantity: number;
};

type DeckBuilderProps = {
  deckId: string;
  deckName: string;
  deckFormat: string | null;
  collectionCards: CollectionCard[];
  initialDeckCards: DeckCard[];
};

function normalizeCardName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

const basicEnergyNames = new Set([
  "energia de planta",
  "energia planta",
  "grass energy",
  "energia de fogo",
  "energia fogo",
  "fire energy",
  "energia de agua",
  "energia agua",
  "water energy",
  "energia eletrica",
  "energia de raio",
  "lightning energy",
  "energia psiquica",
  "psychic energy",
  "energia de luta",
  "energia luta",
  "fighting energy",
  "energia de escuridao",
  "energia escuridao",
  "darkness energy",
  "energia de metal",
  "energia metal",
  "metal energy",
  "energia de fada",
  "energia fada",
  "fairy energy",
]);

function isBasicEnergy(cardName: string | null) {
  if (!cardName) {
    return false;
  }

  return basicEnergyNames.has(normalizeCardName(cardName));
}

export function DeckBuilder({
  deckId,
  deckName,
  deckFormat,
  collectionCards,
  initialDeckCards,
}: DeckBuilderProps) {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingCardId, setSavingCardId] = useState<string | null>(null);

  const [deckQuantities, setDeckQuantities] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        initialDeckCards.map((card) => [
          card.user_card_id,
          Number(card.quantity),
        ]),
      ),
  );

  const totalCards = Object.values(deckQuantities).reduce(
    (total, quantity) => total + quantity,
    0,
  );

  const filteredCards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");

    if (!term) {
      return collectionCards;
    }

    return collectionCards.filter((card) => {
      const searchableText = [card.card_name, card.set_name, card.card_number]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return searchableText.includes(term);
    });
  }, [collectionCards, search]);

  const cardsInDeck = useMemo(
    () => collectionCards.filter((card) => (deckQuantities[card.id] || 0) > 0),
    [collectionCards, deckQuantities],
  );

  const quantitiesByCardName = useMemo(() => {
    const quantities: Record<string, number> = {};

    collectionCards.forEach((card) => {
      const quantity = deckQuantities[card.id] || 0;

      if (quantity === 0) {
        return;
      }

      const nameKey = normalizeCardName(card.card_name || card.id);

      quantities[nameKey] = (quantities[nameKey] || 0) + quantity;
    });

    return quantities;
  }, [collectionCards, deckQuantities]);

  const copyViolations = useMemo(() => {
    const violations: Array<{
      name: string;
      quantity: number;
    }> = [];

    const checkedNames = new Set<string>();

    collectionCards.forEach((card) => {
      const nameKey = normalizeCardName(card.card_name || card.id);

      if (checkedNames.has(nameKey)) {
        return;
      }

      checkedNames.add(nameKey);

      const quantity = quantitiesByCardName[nameKey] || 0;

      if (quantity > 4 && !isBasicEnergy(card.card_name)) {
        violations.push({
          name: card.card_name || "Carta sem nome",
          quantity,
        });
      }
    });

    return violations;
  }, [collectionCards, quantitiesByCardName]);

  const deckIsValid = totalCards === 60 && copyViolations.length === 0;
  const progress = Math.min(100, Math.round((totalCards / 60) * 100));
  const remainingCards = Math.max(0, 60 - totalCards);

  function getQuantityByCardName(card: CollectionCard) {
    const nameKey = normalizeCardName(card.card_name || card.id);
    return quantitiesByCardName[nameKey] || 0;
  }

  async function updateCardQuantity(card: CollectionCard, newQuantity: number) {
    if (savingCardId) {
      return;
    }

    const currentQuantity = deckQuantities[card.id] || 0;
    const availableQuantity = Math.max(1, Number(card.quantity || 1));

    if (newQuantity < 0 || newQuantity > availableQuantity) {
      setError(
        `Você possui ${availableQuantity} unidade(s) dessa carta na coleção.`,
      );
      return;
    }

    const newTotal = totalCards - currentQuantity + newQuantity;

    if (newTotal > 60 && newQuantity > currentQuantity) {
      setError("Um deck Pokémon deve ter exatamente 60 cartas.");
      return;
    }

    const currentNameQuantity = getQuantityByCardName(card);
    const newNameQuantity = currentNameQuantity - currentQuantity + newQuantity;

    if (
      !isBasicEnergy(card.card_name) &&
      newNameQuantity > 4 &&
      newQuantity > currentQuantity
    ) {
      setError(`O limite é de 4 cópias de ${card.card_name || "cada carta"}.`);
      return;
    }

    setSavingCardId(card.id);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      if (newQuantity === 0) {
        const { error: deleteError } = await supabase
          .from("deck_cards")
          .delete()
          .eq("deck_id", deckId)
          .eq("user_card_id", card.id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }
      } else {
        const { error: saveError } = await supabase.from("deck_cards").upsert(
          {
            deck_id: deckId,
            user_card_id: card.id,
            quantity: newQuantity,
          },
          {
            onConflict: "deck_id,user_card_id",
          },
        );

        if (saveError) {
          throw new Error(saveError.message);
        }
      }

      setDeckQuantities((current) => {
        const updated = { ...current };

        if (newQuantity === 0) {
          delete updated[card.id];
        } else {
          updated[card.id] = newQuantity;
        }

        return updated;
      });

      setMessage(
        newQuantity === 0
          ? "Carta removida do deck."
          : "Deck atualizado com sucesso.",
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? `Não foi possível atualizar o deck: ${updateError.message}`
          : "Não foi possível atualizar o deck.",
      );
    } finally {
      setSavingCardId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-white text-[#071a4c]">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link href="/" aria-label="MastersTCG — início" className="shrink-0">
            <Image
              src="/masters-logo.png"
              alt="MastersTCG"
              width={1000}
              height={270}
              priority
              className="h-auto w-[190px] sm:w-[240px]"
            />
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-500">
            <Link href="/collection" className="transition hover:text-blue-600">
              Minha coleção
            </Link>

            <Link href="/decks" className="font-bold text-blue-600">
              Meus decks
            </Link>

            <Link href="/profile" className="transition hover:text-blue-600">
              Meu perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          href="/decks"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-700"
        >
          ← Voltar aos meus decks
        </Link>

        <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
              <span aria-hidden="true">✦</span>
              Montagem do deck
            </span>

            <h1 className="mt-5 break-words text-4xl font-black tracking-tight text-[#071a4c] sm:text-5xl">
              {deckName}
            </h1>

            <p className="mt-2 font-semibold text-slate-500">
              Formato: {deckFormat || "Não informado"}
            </p>
          </div>

          <div
            className={`rounded-3xl border px-7 py-5 shadow-sm ${
              deckIsValid
                ? "border-green-200 bg-green-50"
                : "border-blue-200 bg-white"
            }`}
          >
            <p
              className={`text-sm font-bold ${
                deckIsValid ? "text-green-700" : "text-blue-600"
              }`}
            >
              Cartas no deck
            </p>

            <p className="mt-1 text-4xl font-black text-[#071a4c]">
              {totalCards}
              <span className="text-lg text-slate-400">/60</span>
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black text-[#071a4c]">
                Validação do deck
              </h2>

              {deckIsValid ? (
                <p className="mt-1 font-bold text-green-700">
                  ✓ Deck completo para enviar à revisão
                </p>
              ) : copyViolations.length > 0 ? (
                <p className="mt-1 font-bold text-red-600">
                  O deck possui cartas acima do limite permitido.
                </p>
              ) : (
                <p className="mt-1 text-slate-500">
                  Faltam {remainingCards} carta(s) para completar o deck.
                </p>
              )}
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider ${
                deckIsValid
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {deckIsValid ? "Pronto para jogar" : "Em construção"}
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-blue-100">
            <div
              className={`h-full rounded-full transition-all ${
                deckIsValid ? "bg-green-500" : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p
              className={
                totalCards === 60
                  ? "font-semibold text-green-700"
                  : "text-slate-500"
              }
            >
              {totalCards === 60 ? "✓" : "○"} Total de 60 cartas
            </p>

            <p
              className={
                copyViolations.length === 0
                  ? "font-semibold text-green-700"
                  : "font-semibold text-red-600"
              }
            >
              {copyViolations.length === 0 ? "✓" : "✕"} Limite de 4 cópias por
              carta
            </p>
          </div>

          {copyViolations.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              {copyViolations.map((violation) => (
                <p key={violation.name} className="text-sm text-red-700">
                  {violation.name}: {violation.quantity} cópias. Remova{" "}
                  {violation.quantity - 4}.
                </p>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Energias Básicas não possuem o limite de quatro cópias. A
            verificação depende do nome informado no cadastro da carta.
          </p>
        </div>

        {message && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="h-fit rounded-3xl border border-blue-100 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#071a4c]">
                  Cartas escolhidas
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Salvas automaticamente.
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-600">
                {totalCards}/60
              </span>
            </div>

            {cardsInDeck.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-6 text-center text-sm text-slate-500">
                Seu deck ainda não possui cartas.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {cardsInDeck.map((card) => {
                  const quantity = deckQuantities[card.id] || 0;
                  const saving = savingCardId === card.id;
                  const basicEnergy = isBasicEnergy(card.card_name);

                  return (
                    <div
                      key={card.id}
                      className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-black text-[#071a4c]">
                            {card.card_name || "Carta sem nome"}
                          </h3>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {card.set_name || "Coleção não informada"}
                            {card.card_number ? ` • ${card.card_number}` : ""}
                          </p>

                          {basicEnergy && (
                            <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
                              Energia básica
                            </span>
                          )}
                        </div>

                        <span className="shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-sm font-black text-white">
                          {quantity}x
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={saving || Boolean(savingCardId)}
                          onClick={() => updateCardQuantity(card, quantity - 1)}
                          className="h-10 w-10 rounded-xl border border-blue-200 bg-white font-black text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                          aria-label={`Remover uma unidade de ${card.card_name}`}
                        >
                          −
                        </button>

                        <span className="min-w-8 text-center font-black text-[#071a4c]">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          disabled={
                            saving ||
                            Boolean(savingCardId) ||
                            quantity >= card.quantity ||
                            totalCards >= 60 ||
                            (!basicEnergy && getQuantityByCardName(card) >= 4)
                          }
                          onClick={() => updateCardQuantity(card, quantity + 1)}
                          className="h-10 w-10 rounded-xl border border-blue-200 bg-white font-black text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                          aria-label={`Adicionar uma unidade de ${card.card_name}`}
                        >
                          +
                        </button>

                        <button
                          type="button"
                          disabled={saving || Boolean(savingCardId)}
                          onClick={() => updateCardQuantity(card, 0)}
                          className="ml-auto text-xs font-bold text-red-600 transition hover:text-red-700 disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-black text-[#071a4c]">
                  Cartas da minha coleção
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Escolha quais cartas farão parte deste deck.
                </p>
              </div>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar carta..."
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-[#071a4c] outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:max-w-xs"
              />
            </div>

            {collectionCards.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center">
                <h3 className="text-xl font-black text-[#071a4c]">
                  Sua coleção está vazia
                </h3>

                <p className="mt-2 text-slate-500">
                  Adicione cartas à coleção antes de montar um deck.
                </p>

                <Link
                  href="/collection/scan"
                  className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700"
                >
                  Adicionar carta
                </Link>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center text-slate-500">
                Nenhuma carta encontrada para essa busca.
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                {filteredCards.map((card) => {
                  const quantityInDeck = deckQuantities[card.id] || 0;
                  const quantityByName = getQuantityByCardName(card);
                  const basicEnergy = isBasicEnergy(card.card_name);
                  const copyLimitReached = !basicEnergy && quantityByName >= 4;
                  const saving = savingCardId === card.id;

                  return (
                    <article
                      key={card.id}
                      className="min-w-0 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-950/10"
                    >
                      <div className="flex aspect-[2.5/3.5] items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-2 sm:p-3">
                        {card.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={card.imageUrl}
                            alt={card.card_name || "Carta da coleção"}
                            className="h-full w-full rounded-lg object-contain"
                          />
                        ) : (
                          <span className="text-center text-xs font-semibold text-slate-400 sm:text-sm">
                            Sem imagem
                          </span>
                        )}
                      </div>

                      <div className="p-3 sm:p-5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 truncate text-sm font-black text-[#071a4c] sm:text-base">
                            {card.card_name || "Carta sem nome"}
                          </h3>

                          {basicEnergy && (
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase text-blue-600">
                              Básica
                            </span>
                          )}
                        </div>

                        <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
                          {card.set_name || "Coleção não informada"}
                        </p>

                        {card.card_number && (
                          <p className="mt-1 text-xs font-semibold text-blue-600">
                            #{card.card_number}
                          </p>
                        )}

                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          <p className="truncate">
                            {card.card_condition || "Sem estado"}
                          </p>

                          <p>{card.quantity} disponível(is)</p>
                        </div>

                        {!basicEnergy && quantityInDeck > 0 && (
                          <p className="mt-3 text-xs font-bold text-blue-600">
                            {quantityByName}/4 cópias no deck
                          </p>
                        )}

                        <button
                          type="button"
                          disabled={
                            saving ||
                            Boolean(savingCardId) ||
                            quantityInDeck >= card.quantity ||
                            totalCards >= 60 ||
                            copyLimitReached
                          }
                          onClick={() =>
                            updateCardQuantity(card, quantityInDeck + 1)
                          }
                          className="mt-4 min-h-11 w-full rounded-xl bg-blue-600 px-2 py-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:px-4 sm:text-sm"
                        >
                          {saving
                            ? "Salvando..."
                            : copyLimitReached
                              ? "Limite atingido"
                              : quantityInDeck > 0
                                ? `Adicionar (${quantityInDeck})`
                                : "Adicionar ao deck"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
