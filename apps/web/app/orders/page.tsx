import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  OrdersManager,
  type MarketplaceOrder,
} from "@/components/orders-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Compras e vendas | MastersTCG",
  description: "Acompanhe seus pedidos de compra e venda.",
};

export const instant = false;

type OrdersPageProps = {
  searchParams: Promise<{
    created?: string;
    tab?: string;
  }>;
};

type RawOrder = Omit<
  MarketplaceOrder,
  "front_image_url" | "unit_price" | "total_amount" | "has_reviewed"
> & {
  unit_price: number | string;
  total_amount: number | string;
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

async function addSignedImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orders: RawOrder[],
  reviewedOrderIds: Set<string>,
) {
  return Promise.all(
    orders.map(async (order) => ({
      ...order,
      unit_price: Number(order.unit_price),
      total_amount: Number(order.total_amount),
      has_reviewed: reviewedOrderIds.has(order.order_id),
      front_image_url: await createSignedImageUrl(
        supabase,
        order.front_image_path,
      ),
    })),
  );
}

async function OrdersContent({ searchParams }: OrdersPageProps) {
  const query = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: purchasesData, error: purchasesError } = await supabase.rpc(
    "get_marketplace_orders",
    {
      p_scope: "purchases",
    },
  );

  const { data: salesData, error: salesError } = await supabase.rpc(
    "get_marketplace_orders",
    {
      p_scope: "sales",
    },
  );

  const { data: reviewedOrdersData, error: reviewedOrdersError } =
    await supabase
      .from("marketplace_reviews")
      .select("order_id")
      .eq("reviewer_id", user.id);

  const reviewedOrderIds = new Set(
    (reviewedOrdersData || []).map((review) => review.order_id),
  );

  const loadingError = purchasesError || salesError || reviewedOrdersError;

  if (loadingError) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 text-[#071a4c] sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/marketplace"
            className="text-sm font-bold text-blue-700 hover:text-blue-800"
          >
            ← Voltar ao Marketplace
          </Link>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            Não foi possível carregar os pedidos: {loadingError.message}
          </div>
        </div>
      </main>
    );
  }

  const purchases = await addSignedImages(
    supabase,
    (purchasesData || []) as RawOrder[],
    reviewedOrderIds,
  );

  const sales = await addSignedImages(
    supabase,
    (salesData || []) as RawOrder[],
    reviewedOrderIds,
  );

  const initialTab = query.tab === "sales" ? "sales" : "purchases";

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

            <Link
              href="/orders"
              aria-current="page"
              className="font-bold text-blue-700"
            >
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
                Negócios entre Masters
              </span>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Compras e vendas
              </h1>

              <p className="mt-4 max-w-3xl leading-relaxed text-blue-100">
                Acompanhe seus pedidos, confirme vendas e registre a entrega das
                cartas.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <OrdersManager
              initialPurchases={purchases}
              initialSales={sales}
              initialTab={initialTab}
              orderCreated={Boolean(query.created)}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function LoadingOrders() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="h-5 w-48 animate-pulse rounded bg-blue-100" />
        <div className="mt-6 h-36 animate-pulse rounded-3xl bg-blue-100" />
        <div className="mt-10 h-48 animate-pulse rounded-2xl bg-white shadow-sm" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
    </main>
  );
}

export default function OrdersPage(props: OrdersPageProps) {
  return (
    <Suspense fallback={<LoadingOrders />}>
      <OrdersContent {...props} />
    </Suspense>
  );
}
