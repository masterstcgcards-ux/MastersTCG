import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DecksManager } from "@/components/decks-manager";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Meus decks | MastersTCG",
  description: "Crie e organize seus decks de Pokémon TCG.",
};

async function DecksContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: decks, error } = await supabase
    .from("decks")
    .select(
      `
        id,
        name,
        game_slug,
        format,
        description,
        is_public,
        created_at,
        deck_cards (
          quantity
        )
      `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const initialDecks = (decks ?? []).map((deck) => ({
    id: deck.id,
    name: deck.name,
    game_slug: deck.game_slug,
    format: deck.format,
    description: deck.description,
    is_public: deck.is_public,
    created_at: deck.created_at,
    cardCount: Array.isArray(deck.deck_cards)
      ? deck.deck_cards.reduce(
          (total, item) => total + Number(item.quantity || 0),
          0,
        )
      : 0,
  }));

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

          <nav
            aria-label="Navegação principal"
            className="order-3 flex w-full gap-5 overflow-x-auto border-t border-blue-100 pt-4 text-sm font-semibold text-slate-500 md:order-none md:w-auto md:border-0 md:pt-0"
          >
            <Link
              href="/collection"
              className="shrink-0 transition hover:text-blue-600"
            >
              Minha coleção
            </Link>

            <span className="shrink-0 font-bold text-blue-600">Meus decks</span>

            <Link
              href="/marketplace"
              className="shrink-0 transition hover:text-blue-600"
            >
              Marketplace
            </Link>

            <Link
              href="/arena"
              className="shrink-0 transition hover:text-blue-600"
            >
              Arena
            </Link>

            <Link
              href="/ranking"
              className="shrink-0 transition hover:text-blue-600"
            >
              Ranking
            </Link>

            <Link
              href="/profile"
              className="shrink-0 transition hover:text-blue-600"
            >
              Meu perfil
            </Link>
          </nav>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
            <span aria-hidden="true">✦</span>
            Preparação para a Arena
          </span>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-[#071a4c] sm:text-5xl">
            Meus decks
          </h1>

          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
            Crie seus decks de Pokémon TCG, adicione cartas da sua coleção e
            prepare-se para os torneios da Arena.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"
          >
            Não foi possível carregar seus decks: {error.message}
          </div>
        ) : (
          <DecksManager initialDecks={initialDecks} />
        )}
      </section>
    </main>
  );
}

function DecksLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-50 text-[#071a4c]">
      <p className="font-semibold text-slate-500">Carregando seus decks...</p>
    </main>
  );
}

export default function DecksPage() {
  return (
    <Suspense fallback={<DecksLoading />}>
      <DecksContent />
    </Suspense>
  );
}
