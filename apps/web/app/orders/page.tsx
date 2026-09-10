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
      <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          >
            ← Voltar ao Marketplace
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
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

            <Link
              href="/orders"
              aria-current="page"
              className="font-semibold text-white"
            >
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

      <section className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-400">
          Negócios entre Masters
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Compras e vendas
        </h1>

        <p className="mt-4 max-w-3xl text-zinc-400">
          Acompanhe seus pedidos, confirme vendas e registre a entrega das
          cartas.
        </p>

        <div className="mt-10">
          <OrdersManager
            initialPurchases={purchases}
            initialSales={sales}
            initialTab={initialTab}
            orderCreated={Boolean(query.created)}
          />
        </div>
      </section>
    </main>
  );
}

function LoadingOrders() {
  return (
    <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
        <div className="mt-6 h-12 w-96 max-w-full animate-pulse rounded bg-white/10" />
        <div className="mt-10 h-48 animate-pulse rounded-2xl bg-white/5" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-white/5" />
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
