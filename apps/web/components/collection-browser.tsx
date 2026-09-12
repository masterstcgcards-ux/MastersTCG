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
  "w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-[#071a4c] outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15";

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
      <section className="mb-8 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <label
              htmlFor="collection_search"
              className="mb-2 block text-sm font-bold text-slate-700"
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
              className="mb-2 block text-sm font-bold text-slate-700"
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
              className="mb-2 block text-sm font-bold text-slate-700"
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
              className="mb-2 block text-sm font-bold text-slate-700"
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

        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-blue-100 pt-4 text-sm sm:flex-row sm:items-center">
          <p className="text-slate-600">
            <span className="font-black text-[#071a4c]">
              {filteredCards.length}
            </span>{" "}
            {filteredCards.length === 1
              ? "cadastro encontrado"
              : "cadastros encontrados"}
            {" · "}
            <span className="font-black text-blue-700">
              {filteredQuantity}
            </span>{" "}
            {filteredQuantity === 1 ? "carta" : "cartas"}
          </p>

          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-left font-bold text-blue-700 transition hover:text-blue-600 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      {filteredCards.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl font-black text-blue-700">
            ⌕
          </div>

          <h2 className="text-xl font-black text-[#071a4c]">
            Nenhuma carta encontrada
          </h2>

          <p className="mt-2 max-w-md text-slate-600">
            Tente alterar o nome pesquisado ou limpar os filtros selecionados.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-600"
          >
            Limpar busca e filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {filteredCards.map((card) => (
            <Link
              key={card.id}
              href={`/collection/${card.id}`}
              className="group block min-w-0"
            >
              <article className="h-full overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition duration-200 group-hover:-translate-y-1 group-hover:border-blue-300 group-hover:shadow-xl group-hover:shadow-blue-950/10">
                <div className="flex aspect-[2.5/3.5] items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100">
                  {card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.imageUrl}
                      alt={`Foto da carta ${card.card_name || ""}`}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex flex-col items-center px-3 text-center">
                      <span className="text-3xl font-black text-blue-200">
                        M
                      </span>

                      <span className="mt-2 text-xs font-semibold text-slate-400">
                        Imagem da carta
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-5">
                  <h2 className="line-clamp-2 break-words text-sm font-black text-[#071a4c] sm:text-base">
                    {card.card_name || "Carta sem nome"}
                  </h2>

                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 sm:text-sm">
                    {card.set_name || "Coleção não informada"}
                    {card.card_number ? ` • ${card.card_number}` : ""}
                  </p>

                  <div className="mt-4 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:justify-between sm:gap-3">
                    <span className="line-clamp-1">
                      {card.card_condition
                        ? conditionLabels[card.card_condition] ||
                          card.card_condition
                        : "Estado não informado"}
                    </span>

                    <span className="shrink-0 font-semibold text-slate-700">
                      {card.quantity ?? 0}{" "}
                      {card.quantity === 1 ? "unidade" : "unidades"}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-1 text-xs text-slate-400">
                    {card.language
                      ? languageLabels[card.language] || card.language
                      : "Idioma não informado"}
                  </p>

                  <p className="mt-4 text-xs font-bold text-blue-700 transition group-hover:text-blue-600 sm:text-sm">
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
