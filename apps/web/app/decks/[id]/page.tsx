import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { DeckBuilder } from "@/components/deck-builder";
import { createClient } from "@/lib/supabase/server";

type DeckPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata = {
  title: "Montar deck | MastersTCG",
  description: "Escolha as cartas da sua coleção para montar seu deck.",
};

async function DeckContent({ params }: DeckPageProps) {
  const { id: deckId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const userId = user.id;

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select(
      `
        id,
        name,
        format
      `,
    )
    .eq("id", deckId)
    .eq("user_id", userId)
    .maybeSingle();

  if (deckError || !deck) {
    notFound();
  }

  const [
    { data: collectionData, error: collectionError },
    { data: deckCardsData, error: deckCardsError },
  ] = await Promise.all([
    supabase
      .from("user_cards")
      .select(
        `
          id,
          card_name,
          set_name,
          card_number,
          card_condition,
          quantity,
          front_image_path,
          created_at
        `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),

    supabase
      .from("deck_cards")
      .select(
        `
          user_card_id,
          quantity
        `,
      )
      .eq("deck_id", deckId),
  ]);

  if (collectionError || deckCardsError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090f] px-6 text-white">
        <div className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          <h1 className="text-xl font-bold">
            Não foi possível carregar o deck
          </h1>

          <p className="mt-2 text-sm">
            {collectionError?.message ||
              deckCardsError?.message ||
              "Ocorreu um erro inesperado."}
          </p>
        </div>
      </main>
    );
  }

  const collectionCards = await Promise.all(
    (collectionData ?? []).map(async (card) => {
      let imageUrl: string | null = null;

      if (card.front_image_path) {
        const { data: signedImage } = await supabase.storage
          .from("card-scans")
          .createSignedUrl(card.front_image_path, 60 * 60);

        imageUrl = signedImage?.signedUrl ?? null;
      }

      return {
        id: card.id,
        card_name: card.card_name,
        set_name: card.set_name,
        card_number: card.card_number,
        card_condition: card.card_condition,
        quantity: Number(card.quantity || 1),
        imageUrl,
      };
    }),
  );

  const initialDeckCards = (deckCardsData ?? []).map((card) => ({
    user_card_id: card.user_card_id,
    quantity: Number(card.quantity || 1),
  }));

  return (
    <DeckBuilder
      deckId={deck.id}
      deckName={deck.name}
      deckFormat={deck.format}
      collectionCards={collectionCards}
      initialDeckCards={initialDeckCards}
    />
  );
}

function DeckLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p className="text-zinc-400">Carregando o deck...</p>
    </main>
  );
}

export default function DeckPage(props: DeckPageProps) {
  return (
    <Suspense fallback={<DeckLoading />}>
      <DeckContent {...props} />
    </Suspense>
  );
}
