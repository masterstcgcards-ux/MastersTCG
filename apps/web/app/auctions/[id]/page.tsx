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
      <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/auctions"
            className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          >
            ← Voltar aos leilões
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Não foi possível carregar o leilão: {loadingError.message}
          </div>
        </div>
      </main>
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
      <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/auctions"
            className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          >
            ← Voltar aos leilões
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Não foi possível carregar os lances: {historyError.message}
          </div>
        </div>
      </main>
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

            <Link href="/auctions" className="font-semibold text-white">
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
        <Link
          href="/auctions"
          className="text-sm font-semibold text-violet-300 hover:text-violet-200"
        >
          ← Voltar aos leilões
        </Link>

        <div className="mt-8">
          <AuctionDetail initialAuction={auction} initialBids={bids} />
        </div>
      </section>
    </main>
  );
}

function LoadingAuction() {
  return (
    <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="h-5 w-40 animate-pulse rounded bg-white/10" />

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="h-[650px] animate-pulse rounded-2xl bg-white/5" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-white/5" />
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
