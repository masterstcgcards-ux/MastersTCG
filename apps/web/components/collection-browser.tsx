"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CollectionCard = {
  id: string;
  card_name: string | null;
  set_name: string | null;
  card_number: string | null;
  card_condition: string | null;
  language: string | null;
  quantity: number | null;
  front_image_path: string | null;
  created_at: string;
  imageUrl: string | null;
};

type CollectionBrowserProps = {
  cards: CollectionCard[];
};

const conditionLabels: Record<string, string> = {
  mint: "Impecável (Mint)",
  near_mint: "Quase impecável",
  excellent: "Excelente",
  good: "Bom",
  played: "Com desgaste",
  poor: "Muito danificada",
};

const languageLabels: Record<string, string> = {
  "pt-BR": "Português",
  en: "Inglês",
  ja: "Japonês",
  es: "Espanhol",
  other: "Outro",
};

const controlClass =
  "w-full rounded-xl border border-white/15 bg-[#15151f] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400";

export function CollectionBrowser({ cards }: CollectionBrowserProps) {
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState("all");
  const [language, setLanguage] = useState("all");
  const [order, setOrder] = useState("recent");

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    const result = cards.filter((card) => {
      const searchableText = [card.card_name, card.set_name, card.card_number]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      const matchesCondition =
        condition === "all" || card.card_condition === condition;

      const matchesLanguage = language === "all" || card.language === language;

      return matchesSearch && matchesCondition && matchesLanguage;
    });

    return [...result].sort((firstCard, secondCard) => {
      if (order === "name") {
        return (firstCard.card_name || "").localeCompare(
          secondCard.card_name || "",
          "pt-BR",
        );
      }

      if (order === "quantity") {
        return (secondCard.quantity ?? 0) - (firstCard.quantity ?? 0);
      }

      if (order === "oldest") {
        return (
          new Date(firstCard.created_at).getTime() -
          new Date(secondCard.created_at).getTime()
        );
      }

      return (
        new Date(secondCard.created_at).getTime() -
        new Date(firstCard.created_at).getTime()
      );
    });
  }, [cards, search, condition, language, order]);

  const filteredQuantity = filteredCards.reduce(
    (total, card) => total + (card.quantity ?? 0),
    0,
  );

  const filtersActive =
    search.trim() !== "" || condition !== "all" || language !== "all";

  function clearFilters() {
    setSearch("");
    setCondition("all");
    setLanguage("all");
    setOrder("recent");
  }

  return (
    <div>
      <section className="mb-8 rounded-2xl border border-white/10 bg-[#11111b] p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <label
              htmlFor="collection_search"
              className="mb-2 block text-sm font-semibold text-zinc-300"
            >
              Buscar na coleção
            </label>

            <input
              id="collection_search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, coleção ou número"
              className={controlClass}
            />
          </div>

          <div>
            <label
              htmlFor="condition_filter"
              className="mb-2 block text-sm font-semibold text-zinc-300"
            >
              Conservação
            </label>

            <select
              id="condition_filter"
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              className={controlClass}
            >
              <option value="all">Todas</option>
              <option value="mint">Impecável (Mint)</option>
              <option value="near_mint">Quase impecável</option>
              <option value="excellent">Excelente</option>
              <option value="good">Bom</option>
              <option value="played">Com desgaste</option>
              <option value="poor">Muito danificada</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="language_filter"
              className="mb-2 block text-sm font-semibold text-zinc-300"
            >
              Idioma
            </label>

            <select
              id="language_filter"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className={controlClass}
            >
              <option value="all">Todos</option>
              <option value="pt-BR">Português</option>
              <option value="en">Inglês</option>
              <option value="ja">Japonês</option>
              <option value="es">Espanhol</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="order_filter"
              className="mb-2 block text-sm font-semibold text-zinc-300"
            >
              Ordenar
            </label>

            <select
              id="order_filter"
              value={order}
              onChange={(event) => setOrder(event.target.value)}
              className={controlClass}
            >
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="name">Nome de A a Z</option>
              <option value="quantity">Maior quantidade</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-white/10 pt-4 text-sm sm:flex-row sm:items-center">
          <p className="text-zinc-400">
            <span className="font-bold text-white">{filteredCards.length}</span>{" "}
            {filteredCards.length === 1
              ? "cadastro encontrado"
              : "cadastros encontrados"}
            {" · "}
            <span className="font-bold text-violet-300">
              {filteredQuantity}
            </span>{" "}
            {filteredQuantity === 1 ? "carta" : "cartas"}
          </p>

          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-left font-semibold text-violet-400 hover:text-violet-300"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      {filteredCards.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
          <div className="mb-5 text-4xl">⌕</div>

          <h2 className="text-xl font-bold">Nenhuma carta encontrada</h2>

          <p className="mt-2 max-w-md text-zinc-400">
            Tente alterar o nome pesquisado ou limpar os filtros selecionados.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-500"
          >
            Limpar busca e filtros
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filteredCards.map((card) => (
            <Link
              key={card.id}
              href={`/collection/${card.id}`}
              className="group block"
            >
              <article className="h-full overflow-hidden rounded-2xl border border-white/10 bg-[#13131d] transition duration-200 group-hover:-translate-y-1 group-hover:border-violet-500/60 group-hover:shadow-xl group-hover:shadow-violet-950/30">
                <div className="flex aspect-[2.5/3.5] items-center justify-center overflow-hidden bg-gradient-to-br from-violet-950 to-zinc-950">
                  {card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.imageUrl}
                      alt={`Foto da carta ${card.card_name || ""}`}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="text-zinc-500">Imagem da carta</span>
                  )}
                </div>

                <div className="p-5">
                  <h2 className="font-bold">
                    {card.card_name || "Carta sem nome"}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-400">
                    {card.set_name || "Coleção não informada"}
                    {card.card_number ? ` • ${card.card_number}` : ""}
                  </p>

                  <div className="mt-4 flex justify-between gap-3 text-xs text-zinc-500">
                    <span>
                      {card.card_condition
                        ? conditionLabels[card.card_condition] ||
                          card.card_condition
                        : "Estado não informado"}
                    </span>

                    <span>
                      {card.quantity ?? 0}{" "}
                      {card.quantity === 1 ? "unidade" : "unidades"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-zinc-600">
                    {card.language
                      ? languageLabels[card.language] || card.language
                      : "Idioma não informado"}
                  </p>

                  <p className="mt-4 text-sm font-semibold text-violet-400">
                    Ver detalhes →
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
