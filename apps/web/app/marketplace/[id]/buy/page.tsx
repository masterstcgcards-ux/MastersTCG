import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { PurchaseForm, type PurchaseListing } from "@/components/purchase-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Comprar carta | MastersTCG",
  description: "Crie um pedido de compra no Marketplace MastersTCG.",
};

export const instant = false;

type BuyPageProps = {
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
  price: number | null;
  shipping_available: boolean;
  city: string | null;
  state: string | null;
  listing_status: string;
  card_name: string;
  set_name: string | null;
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

async function BuyContent({ params }: BuyPageProps) {
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
        <div className="mx-auto max-w-4xl">
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          >
            ← Voltar ao Marketplace
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Não foi possível carregar o anúncio: {listingsError.message}
          </div>
        </div>
      </main>
    );
  }

  const listings = (listingsData || []) as RawListing[];
  const selectedListing = listings.find((listing) => listing.listing_id === id);

  if (
    !selectedListing ||
    selectedListing.listing_type !== "sale" ||
    selectedListing.listing_status !== "active" ||
    selectedListing.price === null ||
    selectedListing.quantity < 1
  ) {
    notFound();
  }

  if (selectedListing.is_own || selectedListing.seller_id === user.id) {
    redirect("/marketplace");
  }

  const imageUrl = await createSignedImageUrl(
    supabase,
    selectedListing.front_image_path,
  );

  const listingForPurchase = {
    listing_id: selectedListing.listing_id,
    title: selectedListing.title,
    quantity: selectedListing.quantity,
    price: Number(selectedListing.price),
    card_name: selectedListing.card_name,
    set_name: selectedListing.set_name,
    card_number: selectedListing.card_number,
    front_image_url: imageUrl,
    seller_display_name: selectedListing.seller_display_name,
    seller_username: selectedListing.seller_username,
    shipping_available: selectedListing.shipping_available,
    city: selectedListing.city,
    state: selectedListing.state,
  } satisfies PurchaseListing;

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

            <Link href="/orders" className="hover:text-white">
              Pedidos
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

      <section className="mx-auto max-w-6xl px-6 py-12">
        <Link
          href="/marketplace"
          className="text-sm font-semibold text-violet-300 hover:text-violet-200"
        >
          ← Voltar ao Marketplace
        </Link>

        <div className="mb-10 mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
            Compra entre Masters
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Confirmar compra
          </h1>

          <p className="mt-4 max-w-3xl text-zinc-400">
            Revise o anúncio, escolha a quantidade e informe como deseja receber
            a carta.
          </p>
        </div>

        <PurchaseForm listing={listingForPurchase} />
      </section>
    </main>
  );
}

function LoadingPurchase() {
  return (
    <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="h-5 w-44 animate-pulse rounded bg-white/10" />
        <div className="mt-8 h-12 w-96 max-w-full animate-pulse rounded bg-white/10" />

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="h-[520px] animate-pulse rounded-2xl bg-white/5" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </main>
  );
}

export default function BuyPage(props: BuyPageProps) {
  return (
    <Suspense fallback={<LoadingPurchase />}>
      <BuyContent {...props} />
    </Suspense>
  );
}
