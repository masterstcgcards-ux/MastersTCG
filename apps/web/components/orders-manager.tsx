"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ReportForm } from "@/components/report-form";
import { ReviewForm } from "@/components/review-form";
import { createClient } from "@/lib/supabase/client";

export type MarketplaceOrder = {
  order_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  delivery_method: string;
  recipient_name: string | null;
  postal_code: string | null;
  address_line: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  buyer_notes: string | null;
  order_status: string;
  listing_title: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  front_image_path: string | null;
  front_image_url: string | null;
  buyer_display_name: string | null;
  buyer_username: string | null;
  seller_display_name: string | null;
  seller_username: string | null;
  created_at: string;
  has_reviewed: boolean;
  updated_at: string;
};

type OrdersManagerProps = {
  initialPurchases: MarketplaceOrder[];
  initialSales: MarketplaceOrder[];
  initialTab?: "purchases" | "sales";
  orderCreated?: boolean;
};

const statusLabels: Record<string, string> = {
  pending: "Aguardando vendedor",
  confirmed: "Confirmado",
  shipped: "Enviado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-200",
  confirmed: "bg-blue-500/15 text-blue-200",
  shipped: "bg-violet-500/15 text-violet-200",
  completed: "bg-emerald-500/15 text-emerald-200",
  cancelled: "bg-red-500/15 text-red-200",
};

const deliveryLabels: Record<string, string> = {
  shipping: "Envio",
  pickup: "Retirada em mãos",
  arranged: "A combinar",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function OrdersManager({
  initialPurchases,
  initialSales,
  initialTab = "purchases",
  orderCreated = false,
}: OrdersManagerProps) {
  const updatingRef = useRef(false);

  const [currentTab, setCurrentTab] = useState<"purchases" | "sales">(
    initialTab,
  );
  const [purchases, setPurchases] = useState(initialPurchases);
  const [sales, setSales] = useState(initialSales);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState(
    orderCreated ? "Pedido criado! Aguarde a confirmação do vendedor." : "",
  );
  const [error, setError] = useState("");

  const currentOrders = currentTab === "purchases" ? purchases : sales;

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") {
      return currentOrders;
    }

    return currentOrders.filter((order) => order.order_status === statusFilter);
  }, [currentOrders, statusFilter]);

  function changeTab(tab: "purchases" | "sales") {
    setCurrentTab(tab);
    setStatusFilter("all");
    setMessage("");
    setError("");
  }

  async function updateStatus(order: MarketplaceOrder, newStatus: string) {
    if (updatingRef.current) {
      return;
    }

    const confirmationMessages: Record<string, string> = {
      confirmed: "Deseja confirmar este pedido?",
      shipped: "Confirma que o pedido foi enviado?",
      completed: "Confirma que recebeu a carta e deseja concluir o pedido?",
      cancelled: "Deseja realmente cancelar este pedido?",
    };

    if (
      !window.confirm(
        confirmationMessages[newStatus] || "Deseja atualizar este pedido?",
      )
    ) {
      return;
    }

    updatingRef.current = true;
    setUpdatingOrderId(order.order_id);
    setMessage("");
    setError("");

    const supabase = createClient();

    const { error: updateError } = await supabase.rpc(
      "update_marketplace_order_status",
      {
        p_order_id: order.order_id,
        p_new_status: newStatus,
      },
    );

    if (updateError) {
      setError(updateError.message || "Não foi possível atualizar o pedido.");
      updatingRef.current = false;
      setUpdatingOrderId(null);
      return;
    }

    const updateOrders = (orders: MarketplaceOrder[]) =>
      orders.map((item) =>
        item.order_id === order.order_id
          ? {
              ...item,
              order_status: newStatus,
              updated_at: new Date().toISOString(),
            }
          : item,
      );

    setPurchases(updateOrders);
    setSales(updateOrders);

    const successMessages: Record<string, string> = {
      confirmed: "Pedido confirmado.",
      shipped: "Pedido marcado como enviado.",
      completed: "Pedido concluído com sucesso.",
      cancelled: "Pedido cancelado e estoque devolvido ao anúncio.",
    };

    setMessage(successMessages[newStatus] || "Pedido atualizado com sucesso.");

    updatingRef.current = false;
    setUpdatingOrderId(null);
  }

  return (
    <div>
      <section className="rounded-2xl border border-white/10 bg-[#13131d] p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black">Central de pedidos</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Acompanhe suas compras e administre suas vendas.
            </p>
          </div>

          <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => changeTab("purchases")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                currentTab === "purchases"
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Minhas compras
            </button>

            <button
              type="button"
              onClick={() => changeTab("sales")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                currentTab === "sales"
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Minhas vendas
            </button>
          </div>
        </div>

        <div className="mt-6 max-w-sm">
          <label
            htmlFor="status-filter"
            className="mb-2 block text-sm font-semibold"
          >
            Filtrar por situação
          </label>

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0d0d16] px-4 py-3 outline-none focus:border-violet-500"
          >
            <option value="all">Todos</option>
            <option value="pending">Aguardando vendedor</option>
            <option value="confirmed">Confirmados</option>
            <option value="shipped">Enviados</option>
            <option value="completed">Concluídos</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
      </section>

      {message && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
        >
          {error}
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-12 text-center">
          <p className="text-zinc-400">
            {currentTab === "purchases"
              ? "Você não possui compras neste filtro."
              : "Você não possui vendas neste filtro."}
          </p>

          {currentTab === "purchases" && (
            <Link
              href="/marketplace"
              className="mt-5 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500"
            >
              Explorar Marketplace
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          {filteredOrders.map((order) => {
            const updating = updatingOrderId === order.order_id;
            const counterpartName =
              currentTab === "purchases"
                ? order.seller_display_name ||
                  order.seller_username ||
                  "Vendedor"
                : order.buyer_display_name ||
                  order.buyer_username ||
                  "Comprador";

            return (
              <article
                key={order.order_id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#13131d]"
              >
                <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="min-h-64 bg-black/30">
                    {order.front_image_url ? (
                      <img
                        src={order.front_image_url}
                        alt={order.card_name}
                        className="h-full w-full object-contain p-5"
                      />
                    ) : (
                      <div className="flex h-full min-h-64 items-center justify-center text-sm text-zinc-600">
                        Imagem não disponível
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
                          {currentTab === "purchases"
                            ? `Vendido por ${counterpartName}`
                            : `Comprado por ${counterpartName}`}
                        </p>

                        <h3 className="mt-2 break-words text-2xl font-black">
                          {order.listing_title}
                        </h3>

                        <p className="mt-2 font-semibold">{order.card_name}</p>

                        <p className="mt-1 text-sm text-zinc-500">
                          {order.set_name || "Coleção não informada"}
                          {order.card_number ? ` · ${order.card_number}` : ""}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          statusStyles[order.order_status] ||
                          "bg-white/10 text-zinc-300"
                        }`}
                      >
                        {statusLabels[order.order_status] || order.order_status}
                      </span>
                    </div>

                    <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-zinc-500">Quantidade</dt>
                        <dd className="mt-1 font-semibold">{order.quantity}</dd>
                      </div>

                      <div>
                        <dt className="text-zinc-500">Valor unitário</dt>
                        <dd className="mt-1 font-semibold">
                          {formatCurrency(order.unit_price)}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-zinc-500">Total</dt>
                        <dd className="mt-1 font-bold text-emerald-400">
                          {formatCurrency(order.total_amount)}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-zinc-500">Entrega</dt>
                        <dd className="mt-1 font-semibold">
                          {deliveryLabels[order.delivery_method] ||
                            order.delivery_method}
                        </dd>
                      </div>
                    </dl>

                    {order.delivery_method === "shipping" && (
                      <details className="mt-6 rounded-xl border border-white/10 p-4">
                        <summary className="cursor-pointer font-semibold">
                          Ver endereço de entrega
                        </summary>

                        <div className="mt-4 space-y-1 text-sm text-zinc-300">
                          <p className="font-semibold">
                            {order.recipient_name}
                          </p>
                          <p>
                            {order.address_line}, {order.address_number}
                            {order.address_complement
                              ? ` — ${order.address_complement}`
                              : ""}
                          </p>
                          <p>
                            {[order.neighborhood, order.city, order.state]
                              .filter(Boolean)
                              .join(" — ")}
                          </p>
                          <p>CEP: {order.postal_code}</p>
                        </div>
                      </details>
                    )}

                    {order.buyer_notes && (
                      <div className="mt-5 rounded-xl bg-white/5 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                          Mensagem do comprador
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-300">
                          {order.buyer_notes}
                        </p>
                      </div>
                    )}
                    {order.order_status === "completed" &&
                      !order.has_reviewed && (
                        <ReviewForm
                          orderId={order.order_id}
                          reviewedName={counterpartName}
                        />
                      )}

                    {order.order_status === "completed" &&
                      order.has_reviewed && (
                        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                          Você já avaliou esta negociação.
                        </div>
                      )}

                    <ReportForm
                      targetType="order"
                      targetId={order.order_id}
                      targetLabel="negociação"
                    />
                    <p className="mt-5 text-xs text-zinc-600">
                      Pedido criado em {formatDate(order.created_at)}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {currentTab === "sales" &&
                        order.order_status === "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={updating}
                              onClick={() => updateStatus(order, "confirmed")}
                              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50"
                            >
                              {updating ? "Atualizando..." : "Confirmar pedido"}
                            </button>

                            <button
                              type="button"
                              disabled={updating}
                              onClick={() => updateStatus(order, "cancelled")}
                              className="rounded-xl border border-red-500/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              Cancelar pedido
                            </button>
                          </>
                        )}

                      {currentTab === "sales" &&
                        order.order_status === "confirmed" && (
                          <>
                            {order.delivery_method === "shipping" && (
                              <button
                                type="button"
                                disabled={updating}
                                onClick={() => updateStatus(order, "shipped")}
                                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50"
                              >
                                {updating
                                  ? "Atualizando..."
                                  : "Marcar como enviado"}
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={updating}
                              onClick={() => updateStatus(order, "cancelled")}
                              className="rounded-xl border border-red-500/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              Cancelar pedido
                            </button>
                          </>
                        )}

                      {currentTab === "purchases" &&
                        order.order_status === "pending" && (
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() => updateStatus(order, "cancelled")}
                            className="rounded-xl border border-red-500/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            {updating ? "Cancelando..." : "Cancelar compra"}
                          </button>
                        )}

                      {currentTab === "purchases" &&
                        order.delivery_method !== "shipping" &&
                        order.order_status === "confirmed" && (
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() => updateStatus(order, "completed")}
                            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {updating
                              ? "Concluindo..."
                              : "Confirmar recebimento"}
                          </button>
                        )}

                      {currentTab === "purchases" &&
                        order.order_status === "shipped" && (
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() => updateStatus(order, "completed")}
                            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {updating
                              ? "Concluindo..."
                              : "Confirmar recebimento"}
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-sm leading-6 text-yellow-100">
        O MastersTCG registra e acompanha o pedido, mas não processa pagamentos
        nesta etapa. Confira a carta e combine pagamento e entrega com
        segurança.
      </div>
    </div>
  );
}
