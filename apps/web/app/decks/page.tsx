import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

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
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-5">
          <Link
            href="/"
            aria-label="MastersTCG — início"
            className="text-2xl font-black tracking-tight"
          >
            MASTERS<span className="text-violet-400">TCG</span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="flex flex-wrap items-center gap-5 text-sm text-zinc-400"
          >
            <Link href="/collection" className="hover:text-white">
              Minha coleção
            </Link>

            <Link href="/decks" className="font-semibold text-white">
              Meus decks
            </Link>

            <Link href="/profile" className="hover:text-white">
              Meu perfil
            </Link>

            <span className="text-zinc-600">Arena · Em breve</span>
          </nav>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
            Preparação para a Arena
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Meus decks
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-400">
            Crie e organize seus decks de Pokémon TCG. No próximo passo,
            adicionaremos as cartas da sua coleção aos decks.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
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
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p className="text-zinc-400">Carregando seus decks...</p>
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
