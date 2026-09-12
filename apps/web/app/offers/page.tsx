import Image from "next/image";
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

            <Link
              href="/offers"
              aria-current="page"
              className="font-bold text-blue-700"
            >
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

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-10 text-white sm:px-10 sm:py-12">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl"
            />

            <div className="relative">
              <span className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
                Trocas entre Masters
              </span>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Minhas propostas
              </h1>

              <p className="mt-4 max-w-3xl leading-relaxed text-blue-100">
                Analise propostas recebidas nos seus anúncios e acompanhe as
                propostas enviadas para outros colecionadores.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
              <strong className="font-bold">Troque com segurança.</strong>{" "}
              Aceitar uma proposta reserva o anúncio, mas não transfere as
              cartas automaticamente. Confira as cartas e combine a conclusão
              diretamente com o outro colecionador.
            </div>

            {loadingError && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                Não foi possível carregar todas as propostas:{" "}
                {loadingError.message}
              </div>
            )}

            <div className="mt-8">
              <TradeOffersManager
                initialReceivedOffers={receivedOffers}
                initialSentOffers={sentOffers}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function OffersLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl border border-blue-100 bg-white px-8 py-6 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

        <p className="mt-4 font-semibold text-slate-600">
          Carregando propostas...
        </p>
      </div>
    </div>
  );
}

export default function OffersPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 text-[#071a4c]">
      <Suspense fallback={<OffersLoading />}>
        <OffersContent />
      </Suspense>
    </main>
  );
}
