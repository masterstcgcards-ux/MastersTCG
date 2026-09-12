"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

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
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-blue-200 bg-blue-50 text-blue-700",
  shipped: "border-indigo-200 bg-indigo-50 text-indigo-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
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
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">
              Área de negociações
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#071a4c]">
              Central de pedidos
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Acompanhe suas compras e administre suas vendas.
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-2xl border border-blue-100 bg-blue-50 p-1">
            <button
              type="button"
              onClick={() => changeTab("purchases")}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                currentTab === "purchases"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-blue-700"
              }`}
            >
              Minhas compras
            </button>

            <button
              type="button"
              onClick={() => changeTab("sales")}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                currentTab === "sales"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-blue-700"
              }`}
            >
              Minhas vendas
            </button>
          </div>
        </div>

        <div className="mt-7 max-w-sm">
          <label
            htmlFor="status-filter"
            className="mb-2 block text-sm font-bold text-[#071a4c]"
          >
            Filtrar por situação
          </label>

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
          className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600">
            ◇
          </div>

          <h3 className="mt-5 text-xl font-black text-[#071a4c]">
            Nenhum pedido encontrado
          </h3>

          <p className="mt-2 text-slate-600">
            {currentTab === "purchases"
              ? "Você não possui compras neste filtro."
              : "Você não possui vendas neste filtro."}
          </p>

          {currentTab === "purchases" && (
            <Link
              href="/marketplace"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
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
                className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid md:grid-cols-[230px_minmax(0,1fr)]">
                  <div className="flex min-h-72 items-center justify-center border-b border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-5 md:border-b-0 md:border-r">
                    {order.front_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={order.front_image_url}
                        alt={order.card_name}
                        className="aspect-[2.5/3.5] max-h-72 w-auto max-w-full rounded-xl object-contain drop-shadow-lg"
                      />
                    ) : (
                      <div className="flex aspect-[2.5/3.5] h-64 items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-white px-5 text-center text-sm text-slate-400">
                        Imagem não disponível
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 p-5 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                          {currentTab === "purchases"
                            ? `Vendido por ${counterpartName}`
                            : `Comprado por ${counterpartName}`}
                        </p>

                        <h3 className="mt-2 break-words text-2xl font-black text-[#071a4c]">
                          {order.listing_title}
                        </h3>

                        <p className="mt-2 font-bold text-slate-800">
                          {order.card_name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {order.set_name || "Coleção não informada"}
                          {order.card_number ? ` · ${order.card_number}` : ""}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                          statusStyles[order.order_status] ||
                          "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {statusLabels[order.order_status] || order.order_status}
                      </span>
                    </div>

                    <dl className="mt-6 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-xs font-semibold text-slate-500">
                          Quantidade
                        </dt>
                        <dd className="mt-1 font-bold text-[#071a4c]">
                          {order.quantity}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-xs font-semibold text-slate-500">
                          Valor unitário
                        </dt>
                        <dd className="mt-1 font-bold text-[#071a4c]">
                          {formatCurrency(order.unit_price)}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-blue-50 p-3">
                        <dt className="text-xs font-semibold text-blue-600">
                          Total
                        </dt>
                        <dd className="mt-1 font-black text-blue-700">
                          {formatCurrency(order.total_amount)}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-xs font-semibold text-slate-500">
                          Entrega
                        </dt>
                        <dd className="mt-1 font-bold text-[#071a4c]">
                          {deliveryLabels[order.delivery_method] ||
                            order.delivery_method}
                        </dd>
                      </div>
                    </dl>

                    {order.delivery_method === "shipping" && (
                      <details className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/50">
                        <summary className="cursor-pointer px-4 py-4 font-bold text-blue-700">
                          Ver endereço de entrega
                        </summary>

                        <div className="border-t border-blue-100 bg-white px-4 py-4 text-sm leading-relaxed text-slate-600">
                          <p className="font-bold text-[#071a4c]">
                            {order.recipient_name}
                          </p>

                          <p className="mt-1">
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
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Mensagem do comprador
                        </p>

                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
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
                        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                          Você já avaliou esta negociação.
                        </div>
                      )}

                    <ReportForm
                      targetType="order"
                      targetId={order.order_id}
                      targetLabel="negociação"
                    />

                    <p className="mt-5 text-xs font-medium text-slate-400">
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
                              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {updating ? "Atualizando..." : "Confirmar pedido"}
                            </button>

                            <button
                              type="button"
                              disabled={updating}
                              onClick={() => updateStatus(order, "cancelled")}
                              className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                              className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <strong className="font-black">Negocie com segurança.</strong> O
        MastersTCG registra e acompanha o pedido, mas não processa pagamentos
        nesta etapa. Confira a carta e combine pagamento e entrega com
        segurança.
      </div>
    </div>
  );
}
