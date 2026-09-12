import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AuctionDetail, type AuctionBid } from "@/components/auction-detail";
import type { MarketplaceAuction } from "@/components/auctions-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Leilão | MastersTCG",
  description: "Acompanhe e participe de um leilão de cartas.",
};

export const instant = false;

type AuctionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RawAuction = Omit<
  MarketplaceAuction,
  "front_image_url" | "starting_price" | "minimum_increment" | "current_price"
> & {
  starting_price: number | string;
  minimum_increment: number | string;
  current_price: number | string;
};

type RawBid = Omit<AuctionBid, "amount"> & {
  amount: number | string;
};

function ErrorState({ message, detail }: { message: string; detail: string }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 text-[#071a4c] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/auctions"
          className="text-sm font-bold text-blue-700 transition hover:text-blue-800"
        >
          ← Voltar aos leilões
        </Link>

        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="font-bold">{message}</p>
          <p className="mt-2 text-sm">{detail}</p>
        </div>
      </div>
    </main>
  );
}

async function AuctionContent({ params }: AuctionPageProps) {
  const { id } = await params;
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

  const loadingError = allError || mineError || bidsError;

  if (loadingError) {
    return (
      <ErrorState
        message="Não foi possível carregar o leilão."
        detail={loadingError.message}
      />
    );
  }

  const combinedAuctions = [
    ...((allData || []) as RawAuction[]),
    ...((mineData || []) as RawAuction[]),
    ...((bidsData || []) as RawAuction[]),
  ];

  const rawAuction = combinedAuctions.find(
    (auction) => auction.auction_id === id,
  );

  if (!rawAuction) {
    notFound();
  }

  const { data: bidsHistoryData, error: historyError } = await supabase.rpc(
    "get_marketplace_auction_bids",
    {
      p_auction_id: id,
    },
  );

  if (historyError) {
    return (
      <ErrorState
        message="Não foi possível carregar os lances."
        detail={historyError.message}
      />
    );
  }

  let imageUrl: string | null = null;

  if (rawAuction.front_image_path) {
    const { data: imageData } = await supabase.storage
      .from("card-scans")
      .createSignedUrl(rawAuction.front_image_path, 60 * 60);

    imageUrl = imageData?.signedUrl || null;
  }

  const auction: MarketplaceAuction = {
    ...rawAuction,
    starting_price: Number(rawAuction.starting_price),
    minimum_increment: Number(rawAuction.minimum_increment),
    current_price: Number(rawAuction.current_price),
    front_image_url: imageUrl,
  };

  const bids: AuctionBid[] = ((bidsHistoryData || []) as RawBid[]).map(
    (bid) => ({
      ...bid,
      amount: Number(bid.amount),
    }),
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

            <Link href="/auctions" className="font-bold text-blue-700">
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
        <Link
          href="/auctions"
          className="inline-flex items-center rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          ← Voltar aos leilões
        </Link>

        <div className="mt-7">
          <AuctionDetail initialAuction={auction} initialBids={bids} />
        </div>
      </section>
    </main>
  );
}

function LoadingAuction() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="h-11 w-44 animate-pulse rounded-xl bg-blue-100" />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="h-[650px] animate-pulse rounded-3xl bg-white shadow-sm" />
          <div className="h-[520px] animate-pulse rounded-3xl bg-white shadow-sm" />
        </div>
      </div>
    </main>
  );
}

export default function AuctionPage(props: AuctionPageProps) {
  return (
    <Suspense fallback={<LoadingAuction />}>
      <AuctionContent {...props} />
    </Suspense>
  );
}
