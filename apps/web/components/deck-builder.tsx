"use client";

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
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight">
            MASTERS<span className="text-violet-400">TCG</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm text-zinc-400">
            <Link href="/collection" className="hover:text-white">
              Minha coleção
            </Link>

            <Link href="/decks" className="font-semibold text-white">
              Meus decks
            </Link>

            <Link href="/profile" className="hover:text-white">
              Meu perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/decks" className="text-sm text-zinc-400 hover:text-white">
          ← Voltar aos meus decks
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
              Montagem do deck
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">{deckName}</h1>

            <p className="mt-2 text-zinc-400">
              Formato: {deckFormat || "Não informado"}
            </p>
          </div>

          <div
            className={`rounded-2xl border px-6 py-4 ${
              deckIsValid
                ? "border-green-500/30 bg-green-500/10"
                : "border-violet-500/30 bg-violet-500/10"
            }`}
          >
            <p
              className={`text-sm ${
                deckIsValid ? "text-green-200" : "text-violet-200"
              }`}
            >
              Cartas no deck
            </p>

            <p className="mt-1 text-3xl font-black">
              {totalCards}
              <span className="text-lg text-zinc-500">/60</span>
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#11111b] p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black">Validação do deck</h2>

              {deckIsValid ? (
                <p className="mt-1 font-semibold text-green-300">
                  ✓ ✓ Deck completo para enviar à revisão
                </p>
              ) : copyViolations.length > 0 ? (
                <p className="mt-1 font-semibold text-red-300">
                  O deck possui cartas acima do limite permitido.
                </p>
              ) : (
                <p className="mt-1 text-zinc-400">
                  Faltam {remainingCards} carta(s) para completar o deck.
                </p>
              )}
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                deckIsValid
                  ? "bg-green-500/15 text-green-300"
                  : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {deckIsValid ? "Pronto para jogar" : "Em construção"}
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${
                deckIsValid ? "bg-green-500" : "bg-violet-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p
              className={totalCards === 60 ? "text-green-300" : "text-zinc-400"}
            >
              {totalCards === 60 ? "✓" : "○"} Total de 60 cartas
            </p>

            <p
              className={
                copyViolations.length === 0 ? "text-green-300" : "text-red-300"
              }
            >
              {copyViolations.length === 0 ? "✓" : "✕"} Limite de 4 cópias por
              carta
            </p>
          </div>

          {copyViolations.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              {copyViolations.map((violation) => (
                <p key={violation.name} className="text-sm text-red-200">
                  {violation.name}: {violation.quantity} cópias. Remova{" "}
                  {violation.quantity - 4}.
                </p>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-zinc-500">
            Energias Básicas não possuem o limite de quatro cópias. A
            verificação depende do nome informado no cadastro da carta.
          </p>
        </div>

        {message && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200"
          >
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

        <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="h-fit rounded-2xl border border-white/10 bg-[#11111b] p-6 lg:sticky lg:top-6">
            <h2 className="text-xl font-black">Cartas escolhidas</h2>

            <p className="mt-2 text-sm text-zinc-400">
              As alterações são salvas automaticamente.
            </p>

            {cardsInDeck.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
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
                      className="rounded-xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold">
                            {card.card_name || "Carta sem nome"}
                          </h3>

                          <p className="mt-1 text-xs text-zinc-500">
                            {card.set_name || "Coleção não informada"}
                            {card.card_number ? ` • ${card.card_number}` : ""}
                          </p>

                          {basicEnergy && (
                            <span className="mt-2 inline-block rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase text-blue-300">
                              Energia básica
                            </span>
                          )}
                        </div>

                        <span className="rounded-lg bg-violet-500/15 px-3 py-1 text-sm font-bold text-violet-300">
                          {quantity}x
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={saving || Boolean(savingCardId)}
                          onClick={() => updateCardQuantity(card, quantity - 1)}
                          className="h-9 w-9 rounded-lg border border-white/15 font-bold hover:bg-white/10 disabled:opacity-50"
                          aria-label={`Remover uma unidade de ${card.card_name}`}
                        >
                          −
                        </button>

                        <span className="min-w-8 text-center font-bold">
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
                          className="h-9 w-9 rounded-lg border border-white/15 font-bold hover:bg-white/10 disabled:opacity-50"
                          aria-label={`Adicionar uma unidade de ${card.card_name}`}
                        >
                          +
                        </button>

                        <button
                          type="button"
                          disabled={saving || Boolean(savingCardId)}
                          onClick={() => updateCardQuantity(card, 0)}
                          className="ml-auto text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-50"
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

          <div>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-black">Cartas da minha coleção</h2>

                <p className="mt-1 text-sm text-zinc-400">
                  Escolha quais cartas farão parte deste deck.
                </p>
              </div>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar carta..."
                className="w-full rounded-xl border border-white/10 bg-[#11111b] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-violet-500 sm:max-w-xs"
              />
            </div>

            {collectionCards.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center">
                <h3 className="text-xl font-bold">Sua coleção está vazia</h3>

                <p className="mt-2 text-zinc-400">
                  Adicione cartas à coleção antes de montar um deck.
                </p>

                <Link
                  href="/collection/scan"
                  className="mt-6 inline-block rounded-xl bg-violet-600 px-5 py-3 font-bold hover:bg-violet-500"
                >
                  Adicionar carta
                </Link>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center text-zinc-400">
                Nenhuma carta encontrada para essa busca.
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCards.map((card) => {
                  const quantityInDeck = deckQuantities[card.id] || 0;
                  const quantityByName = getQuantityByCardName(card);
                  const basicEnergy = isBasicEnergy(card.card_name);
                  const copyLimitReached = !basicEnergy && quantityByName >= 4;
                  const saving = savingCardId === card.id;

                  return (
                    <article
                      key={card.id}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-[#13131d]"
                    >
                      <div className="flex aspect-[2.5/3.5] items-center justify-center bg-gradient-to-br from-violet-950 to-zinc-950">
                        {card.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={card.imageUrl}
                            alt={card.card_name || "Carta da coleção"}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-sm text-zinc-500">
                            Sem imagem
                          </span>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-bold">
                            {card.card_name || "Carta sem nome"}
                          </h3>

                          {basicEnergy && (
                            <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-300">
                              Básica
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-zinc-400">
                          {card.set_name || "Coleção não informada"}
                          {card.card_number ? ` • ${card.card_number}` : ""}
                        </p>

                        <div className="mt-3 flex justify-between text-xs text-zinc-500">
                          <span>{card.card_condition || "Sem estado"}</span>

                          <span>{card.quantity} disponível(is)</span>
                        </div>

                        {!basicEnergy && quantityInDeck > 0 && (
                          <p className="mt-3 text-xs text-violet-300">
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
                          className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving
                            ? "Salvando..."
                            : copyLimitReached
                              ? "Limite de 4 atingido"
                              : quantityInDeck > 0
                                ? `Adicionar mais (${quantityInDeck} no deck)`
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
