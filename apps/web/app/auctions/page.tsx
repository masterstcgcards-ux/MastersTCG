import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  AuctionsManager,
  type AuctionCollectionCard,
  type MarketplaceAuction,
} from "@/components/auctions-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Leilões | MastersTCG",
  description: "Participe de leilões de cartas entre Masters.",
};

export const instant = false;

type RawAuction = Omit<
  MarketplaceAuction,
  "front_image_url" | "starting_price" | "minimum_increment" | "current_price"
> & {
  starting_price: number | string;
  minimum_increment: number | string;
  current_price: number | string;
};

type RawCollectionCard = Omit<AuctionCollectionCard, "front_image_url">;

async function createSignedImageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imagePath: string | null,
) {
  if (!imagePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from("card-scans")
    .createSignedUrl(imagePath, 60 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

async function prepareAuctions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  auctions: RawAuction[],
) {
  return Promise.all(
    auctions.map(async (auction) => ({
      ...auction,
      starting_price: Number(auction.starting_price),
      minimum_increment: Number(auction.minimum_increment),
      current_price: Number(auction.current_price),
      front_image_url: await createSignedImageUrl(
        supabase,
        auction.front_image_path,
      ),
    })),
  );
}

async function prepareCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cards: RawCollectionCard[],
) {
  return Promise.all(
    cards.map(async (card) => ({
      ...card,
      front_image_url: await createSignedImageUrl(
        supabase,
        card.front_image_path,
      ),
    })),
  );
}

async function AuctionsContent() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: allData, error: allError } = await supabase.rpc(
    "get_marketplace_auctions",
    {
      p_scope: "all",
    },
  );

  const { data: mineData, error: mineError } = await supabase.rpc(
    "get_marketplace_auctions",
    {
      p_scope: "mine",
    },
  );

  const { data: bidsData, error: bidsError } = await supabase.rpc(
    "get_marketplace_auctions",
    {
      p_scope: "bids",
    },
  );

  const { data: cardsData, error: cardsError } = await supabase
    .from("user_cards")
    .select("id, quantity, card_name, set_name, card_number, front_image_path")
    .eq("user_id", user.id)
    .gt("quantity", 0)
    .order("created_at", { ascending: false });

  const loadingError = allError || mineError || bidsError || cardsError;

  if (loadingError) {
    return (
      <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          >
            ← Voltar ao Marketplace
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Não foi possível carregar os leilões: {loadingError.message}
          </div>
        </div>
      </main>
    );
  }

  const allAuctions = await prepareAuctions(
    supabase,
    (allData || []) as RawAuction[],
  );

  const myAuctions = await prepareAuctions(
    supabase,
    (mineData || []) as RawAuction[],
  );

  const bidAuctions = await prepareAuctions(
    supabase,
    (bidsData || []) as RawAuction[],
  );

  const collectionCards = await prepareCards(
    supabase,
    (cardsData || []) as RawCollectionCard[],
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-4">
          <Link
            href="/"
            aria-label="MastersTCG — início"
            className="text-xl font-black tracking-tight"
          >
            MASTERS<span className="text-violet-400">TCG</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm text-zinc-400">
            <Link href="/collection" className="hover:text-white">
              Minha coleção
            </Link>

            <Link href="/decks" className="hover:text-white">
              Meus decks
            </Link>

            <Link href="/marketplace" className="hover:text-white">
              Marketplace
            </Link>

            <Link href="/offers" className="hover:text-white">
              Propostas
            </Link>

            <Link href="/orders" className="hover:text-white">
              Pedidos
            </Link>

            <Link
              href="/auctions"
              aria-current="page"
              className="font-semibold text-white"
            >
              Leilões
            </Link>

            <Link href="/arena" className="hover:text-white">
              Arena
            </Link>

            <Link href="/profile" className="hover:text-white">
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-400">
          Disputas entre Masters
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Leilões
        </h1>

        <p className="mt-4 max-w-3xl text-zinc-400">
          Encontre cartas especiais, acompanhe os maiores lances e dispute novos
          itens para sua coleção.
        </p>

        <div className="mt-10">
          <AuctionsManager
            initialAllAuctions={allAuctions}
            initialMyAuctions={myAuctions}
            initialBidAuctions={bidAuctions}
            collectionCards={collectionCards}
          />
        </div>
      </section>
    </main>
  );
}

function LoadingAuctions() {
  return (
    <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="h-5 w-44 animate-pulse rounded bg-white/10" />
        <div className="mt-6 h-12 w-80 animate-pulse rounded bg-white/10" />
        <div className="mt-10 h-48 animate-pulse rounded-2xl bg-white/5" />

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-[520px] animate-pulse rounded-2xl bg-white/5" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-white/5" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </main>
  );
}

export default function AuctionsPage() {
  return (
    <Suspense fallback={<LoadingAuctions />}>
      <AuctionsContent />
    </Suspense>
  );
}
