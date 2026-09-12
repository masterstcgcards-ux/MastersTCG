import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  MarketplaceManager,
  type MarketplaceCard,
  type MarketplaceListing,
} from "@/components/marketplace-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Marketplace | MastersTCG",
  description: "Compre, venda e troque cartas com outros Masters.",
};

type RawMarketplaceCard = Omit<MarketplaceCard, "image_url">;
type RawMarketplaceListing = Omit<MarketplaceListing, "image_url">;

function addImageToCard(
  card: RawMarketplaceCard,
  imageUrls: Map<string, string>,
): MarketplaceCard {
  return {
    ...card,
    image_url: card.front_image_path
      ? imageUrls.get(card.front_image_path) || null
      : null,
  };
}

function addImageToListing(
  listing: RawMarketplaceListing,
  imageUrls: Map<string, string>,
): MarketplaceListing {
  return {
    ...listing,
    image_url: listing.front_image_path
      ? imageUrls.get(listing.front_image_path) || null
      : null,
  };
}

async function MarketplaceContent() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login?next=/marketplace");
  }

  const [cardsResult, activeResult, mineResult] = await Promise.all([
    supabase
      .from("user_cards")
      .select(
        "id, card_name, set_name, card_number, quantity, front_image_path",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_marketplace_listings", {
      p_scope: "active",
    }),
    supabase.rpc("get_marketplace_listings", {
      p_scope: "mine",
    }),
  ]);

  const rawCards = Array.isArray(cardsResult.data)
    ? (cardsResult.data as RawMarketplaceCard[])
    : [];

  const rawActiveListings = Array.isArray(activeResult.data)
    ? (activeResult.data as RawMarketplaceListing[])
    : [];

  const rawOwnListings = Array.isArray(mineResult.data)
    ? (mineResult.data as RawMarketplaceListing[])
    : [];

  const imagePaths = Array.from(
    new Set(
      [
        ...rawCards.map((card) => card.front_image_path),
        ...rawActiveListings.map((listing) => listing.front_image_path),
        ...rawOwnListings.map((listing) => listing.front_image_path),
      ].filter((path): path is string => Boolean(path)),
    ),
  );

  const imageUrls = new Map<string, string>();

  if (imagePaths.length > 0) {
    const { data: signedImages } = await supabase.storage
      .from("card-scans")
      .createSignedUrls(imagePaths, 60 * 60);

    signedImages?.forEach((image) => {
      if (image.path && image.signedUrl) {
        imageUrls.set(image.path, image.signedUrl);
      }
    });
  }

  const cards = rawCards.map((card) => addImageToCard(card, imageUrls));

  const activeListings = rawActiveListings.map((listing) =>
    addImageToListing(listing, imageUrls),
  );

  const ownListings = rawOwnListings.map((listing) =>
    addImageToListing(listing, imageUrls),
  );

  const loadingError =
    cardsResult.error || activeResult.error || mineResult.error;

  return (
    <>
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

            <Link href="/arena" className="transition hover:text-blue-700">
              Arena
            </Link>

            <Link href="/ranking" className="transition hover:text-blue-700">
              Ranking
            </Link>

            <Link
              href="/marketplace"
              aria-current="page"
              className="font-bold text-blue-700"
            >
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

            <Link href="/profile" className="transition hover:text-blue-700">
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-10 text-white sm:px-10 sm:py-12">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl"
            />

            <div className="relative">
              <span className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
                Negócios entre Masters
              </span>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Marketplace
              </h1>

              <p className="mt-4 max-w-3xl leading-relaxed text-blue-100">
                Anuncie cartas da sua coleção para venda ou troca e encontre
                oportunidades publicadas por outros colecionadores.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
              <strong className="font-bold">Negocie com segurança.</strong>{" "}
              Pagamentos, entregas e trocas são combinados diretamente entre os
              usuários. Confira as cartas e os dados da negociação antes de
              concluir.
            </div>

            {loadingError && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                Não foi possível carregar todos os dados do Marketplace:{" "}
                {loadingError.message}
              </div>
            )}

            <div className="mt-8">
              <MarketplaceManager
                userId={user.id}
                cards={cards}
                initialActiveListings={activeListings}
                initialOwnListings={ownListings}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MarketplaceLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl border border-blue-100 bg-white px-8 py-6 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
        <p className="mt-4 font-semibold text-slate-600">
          Carregando Marketplace...
        </p>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 text-[#071a4c]">
      <Suspense fallback={<MarketplaceLoading />}>
        <MarketplaceContent />
      </Suspense>
    </main>
  );
}
