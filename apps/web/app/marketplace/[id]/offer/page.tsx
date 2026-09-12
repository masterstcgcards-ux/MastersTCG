import Image from "next/image";
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

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 text-[#071a4c] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/marketplace"
          className="text-sm font-bold text-blue-700 hover:text-blue-800"
        >
          ← Voltar ao Marketplace
        </Link>

        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          {message}
        </div>
      </div>
    </main>
  );
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
      <ErrorScreen
        message={`Não foi possível carregar este anúncio: ${listingsError.message}`}
      />
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
      <ErrorScreen
        message={`Não foi possível carregar sua coleção: ${cardsError.message}`}
      />
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

            <Link href="/marketplace" className="font-bold text-blue-700">
              Marketplace
            </Link>

            <Link href="/offers" className="transition hover:text-blue-700">
              Propostas
            </Link>

            <Link href="/orders" className="transition hover:text-blue-700">
              Pedidos
            </Link>

            <Link href="/auctions" className="transition hover:text-blue-700">
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

      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          href="/marketplace"
          className="inline-flex items-center text-sm font-bold text-blue-700 transition hover:text-blue-800"
        >
          ← Voltar ao Marketplace
        </Link>

        <div className="mb-8 mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-9 text-white shadow-sm sm:px-10 sm:py-11">
          <span className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
            Trocas entre Masters
          </span>

          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            Fazer proposta
          </h1>

          <p className="mt-4 max-w-3xl leading-relaxed text-blue-100">
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
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="h-5 w-40 animate-pulse rounded bg-blue-100" />
        <div className="mt-8 h-36 animate-pulse rounded-3xl bg-blue-100" />
        <div className="mt-8 h-96 animate-pulse rounded-3xl border border-blue-100 bg-white" />
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
