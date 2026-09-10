import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import {
  TradeOfferForm,
  type TradeOfferCard,
  type TradeOfferListing,
} from "@/components/trade-offer-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Fazer proposta | MastersTCG",
  description: "Envie uma proposta de troca para outro colecionador.",
};

export const instant = false;

type OfferPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RawListing = {
  listing_id: string;
  seller_id: string;
  seller_display_name: string | null;
  seller_username: string | null;
  is_own: boolean;
  listing_type: string;
  title: string;
  quantity: number;
  trade_preferences: string | null;
  listing_status: string;
  card_name: string | null;
  set_name: string | null;
  card_number: string | null;
  front_image_path: string | null;
};

type RawUserCard = {
  id: string;
  quantity: number;
  card_name: string | null;
  set_name: string | null;
  set_code: string | null;
  card_number: string | null;
  front_image_path: string | null;
};

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

async function OfferContent({ params }: OfferPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: listingsData, error: listingsError } = await supabase.rpc(
    "get_marketplace_listings",
  );

  if (listingsError) {
    return (
      <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          >
            ← Voltar ao Marketplace
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Não foi possível carregar este anúncio: {listingsError.message}
          </div>
        </div>
      </main>
    );
  }

  const listings = (listingsData || []) as RawListing[];
  const selectedListing = listings.find((listing) => listing.listing_id === id);

  if (
    !selectedListing ||
    selectedListing.listing_type !== "trade" ||
    selectedListing.listing_status !== "active"
  ) {
    notFound();
  }

  if (selectedListing.is_own || selectedListing.seller_id === user.id) {
    redirect("/marketplace");
  }

  const { data: cardsData, error: cardsError } = await supabase
    .from("user_cards")
    .select(
      "id, quantity, card_name, set_name, set_code, card_number, front_image_path",
    )
    .eq("user_id", user.id)
    .gt("quantity", 0)
    .order("created_at", { ascending: false });

  if (cardsError) {
    return (
      <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          >
            ← Voltar ao Marketplace
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Não foi possível carregar sua coleção: {cardsError.message}
          </div>
        </div>
      </main>
    );
  }

  const listingImageUrl = await createSignedImageUrl(
    supabase,
    selectedListing.front_image_path,
  );

  const cardsWithImages = await Promise.all(
    ((cardsData || []) as RawUserCard[]).map(async (card) => ({
      ...card,
      front_image_url: await createSignedImageUrl(
        supabase,
        card.front_image_path,
      ),
    })),
  );

  const listingForForm = {
    ...selectedListing,
    front_image_url: listingImageUrl,
  } as unknown as TradeOfferListing;

  const cardsForForm = cardsWithImages as unknown as TradeOfferCard[];

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

            <Link href="/marketplace" className="font-semibold text-white">
              Marketplace
            </Link>

            <Link href="/offers" className="hover:text-white">
              Propostas
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

      <section className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href="/marketplace"
          className="text-sm font-semibold text-violet-300 hover:text-violet-200"
        >
          ← Voltar ao Marketplace
        </Link>

        <div className="mb-10 mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-violet-400">
            Trocas entre Masters
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Fazer proposta
          </h1>

          <p className="mt-4 max-w-3xl text-zinc-400">
            Escolha uma carta da sua coleção e envie uma proposta para o
            anunciante.
          </p>
        </div>

        <TradeOfferForm listing={listingForForm} cards={cardsForForm} />
      </section>
    </main>
  );
}

function LoadingOffer() {
  return (
    <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
        <div className="mt-8 h-12 w-80 max-w-full animate-pulse rounded bg-white/10" />
        <div className="mt-10 h-96 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      </div>
    </main>
  );
}

export default function OfferPage(props: OfferPageProps) {
  return (
    <Suspense fallback={<LoadingOffer />}>
      <OfferContent {...props} />
    </Suspense>
  );
}
