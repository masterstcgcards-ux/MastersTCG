import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  TradeOffersManager,
  type TradeOffer,
} from "@/components/trade-offers-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Propostas de troca | MastersTCG",
  description: "Envie, receba e acompanhe propostas de troca de cartas.",
};

type RawTradeOffer = Omit<
  TradeOffer,
  "listing_image_url" | "offered_image_url"
>;

function addImages(
  offer: RawTradeOffer,
  imageUrls: Map<string, string>,
): TradeOffer {
  return {
    ...offer,
    listing_image_url: offer.listing_front_image_path
      ? imageUrls.get(offer.listing_front_image_path) || null
      : null,
    offered_image_url: offer.offered_front_image_path
      ? imageUrls.get(offer.offered_front_image_path) || null
      : null,
  };
}

async function OffersContent() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login?next=/offers");
  }

  const [receivedResult, sentResult] = await Promise.all([
    supabase.rpc("get_trade_offers", {
      p_scope: "received",
    }),
    supabase.rpc("get_trade_offers", {
      p_scope: "sent",
    }),
  ]);

  const rawReceivedOffers = Array.isArray(receivedResult.data)
    ? (receivedResult.data as RawTradeOffer[])
    : [];

  const rawSentOffers = Array.isArray(sentResult.data)
    ? (sentResult.data as RawTradeOffer[])
    : [];

  const imagePaths = Array.from(
    new Set(
      [...rawReceivedOffers, ...rawSentOffers]
        .flatMap((offer) => [
          offer.listing_front_image_path,
          offer.offered_front_image_path,
        ])
        .filter((path): path is string => Boolean(path)),
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

  const receivedOffers = rawReceivedOffers.map((offer) =>
    addImages(offer, imageUrls),
  );

  const sentOffers = rawSentOffers.map((offer) => addImages(offer, imageUrls));

  const loadingError = receivedResult.error || sentResult.error;

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

            <Link
              href="/offers"
              aria-current="page"
              className="font-semibold text-white"
            >
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

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
          Trocas entre Masters
        </p>

        <h1 className="mt-3 text-3xl font-black sm:text-5xl">
          Minhas propostas
        </h1>

        <p className="mt-4 max-w-3xl text-zinc-400">
          Analise propostas recebidas nos seus anúncios e acompanhe as propostas
          enviadas para outros colecionadores.
        </p>

        <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          Aceitar uma proposta reserva o anúncio, mas não transfere as cartas
          automaticamente. Confira as cartas pessoalmente e combine a conclusão
          da troca com segurança.
        </div>

        {loadingError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
          >
            Não foi possível carregar todas as propostas: {loadingError.message}
          </div>
        )}

        <div className="mt-8">
          <TradeOffersManager
            initialReceivedOffers={receivedOffers}
            initialSentOffers={sentOffers}
          />
        </div>
      </section>
    </>
  );
}

function OffersLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p className="text-zinc-400">Carregando propostas...</p>
    </div>
  );
}

export default function OffersPage() {
  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <Suspense fallback={<OffersLoading />}>
        <OffersContent />
      </Suspense>
    </main>
  );
}
