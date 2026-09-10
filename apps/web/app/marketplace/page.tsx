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
            className="flex flex-wrap items-center gap-4 text-sm text-zinc-400"
          >
            <Link href="/collection" className="transition hover:text-white">
              Minha coleção
            </Link>

            <Link href="/decks" className="transition hover:text-white">
              Meus decks
            </Link>

            <Link href="/arena" className="transition hover:text-white">
              Arena
            </Link>

            <Link href="/ranking" className="transition hover:text-white">
              Ranking
            </Link>

            <Link
              href="/marketplace"
              aria-current="page"
              className="font-semibold text-white"
            >
              Marketplace
            </Link>

            <Link href="/profile" className="transition hover:text-white">
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
          Negócios entre Masters
        </p>

        <h1 className="mt-3 text-3xl font-black sm:text-5xl">Marketplace</h1>

        <p className="mt-4 max-w-3xl text-zinc-400">
          Anuncie cartas da sua coleção para venda ou troca e encontre
          oportunidades publicadas por outros colecionadores.
        </p>

        <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          Nesta etapa, o MastersTCG funciona como uma vitrine. Pagamentos,
          entregas e trocas devem ser combinados com cuidado entre os usuários.
          O sistema de propostas será criado no módulo 18.
        </div>

        {loadingError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
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
      </section>
    </>
  );
}

function MarketplaceLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p className="text-zinc-400">Carregando Marketplace...</p>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <Suspense fallback={<MarketplaceLoading />}>
        <MarketplaceContent />
      </Suspense>
    </main>
  );
}
