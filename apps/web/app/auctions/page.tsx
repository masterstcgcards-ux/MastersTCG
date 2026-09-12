import Image from "next/image";
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
      <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 text-[#071a4c] sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/marketplace"
            className="text-sm font-bold text-blue-700 transition hover:text-blue-800"
          >
            ← Voltar ao Marketplace
          </Link>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <p className="font-bold">Não foi possível carregar os leilões.</p>
            <p className="mt-2 text-sm">{loadingError.message}</p>
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
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 text-[#071a4c]">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-6">
          <Link href="/" aria-label="MastersTCG — início">
            <Image
              src="/masters-logo.png"
              alt="MastersTCG"
              width={260}
              height={70}
              priority
              className="h-auto w-44 sm:w-52"
            />
          </Link>

          <nav
            aria-label="Navegação principal"
            className="flex max-w-full flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-slate-600"
          >
            <Link href="/collection" className="transition hover:text-blue-700">
              Minha coleção
            </Link>

            <Link href="/decks" className="transition hover:text-blue-700">
              Meus decks
            </Link>

            <Link
              href="/marketplace"
              className="transition hover:text-blue-700"
            >
              Marketplace
            </Link>

            <Link href="/offers" className="transition hover:text-blue-700">
              Propostas
            </Link>

            <Link href="/orders" className="transition hover:text-blue-700">
              Pedidos
            </Link>

            <Link
              href="/auctions"
              aria-current="page"
              className="font-bold text-blue-700"
            >
              Leilões
            </Link>

            <Link href="/arena" className="transition hover:text-blue-700">
              Arena
            </Link>

            <Link href="/profile" className="transition hover:text-blue-700">
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/25 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl"
          />

          <div className="relative">
            <span className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
              Disputas entre Masters
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
              Leilões
            </h1>

            <p className="mt-4 max-w-3xl leading-relaxed text-blue-100">
              Encontre cartas especiais, acompanhe os maiores lances e dispute
              novos itens para sua coleção.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Lance com segurança
              </span>

              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Acompanhe em tempo real
              </span>

              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                Venda cartas especiais
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8">
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
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="h-5 w-44 animate-pulse rounded bg-blue-100" />
        <div className="mt-6 h-12 w-80 max-w-full animate-pulse rounded bg-blue-100" />
        <div className="mt-10 h-48 animate-pulse rounded-3xl bg-blue-100" />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
          <div className="h-[430px] animate-pulse rounded-3xl bg-white shadow-sm" />
          <div className="h-[430px] animate-pulse rounded-3xl bg-white shadow-sm" />
          <div className="hidden h-[430px] animate-pulse rounded-3xl bg-white shadow-sm xl:block" />
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
