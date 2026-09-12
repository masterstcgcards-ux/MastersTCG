"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

export type PurchaseListing = {
  listing_id: string;
  title: string;
  quantity: number;
  price: number;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  front_image_url: string | null;
  seller_display_name: string | null;
  seller_username: string | null;
  shipping_available: boolean;
  city: string | null;
  state: string | null;
};

type PurchaseFormProps = {
  listing: PurchaseListing;
};

const fieldClass =
  "w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-[#071a4c] outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function PurchaseForm({ listing }: PurchaseFormProps) {
  const router = useRouter();
  const submittingRef = useRef(false);

  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState("arranged");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const total = Number(listing.price) * quantity;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const supabase = createClient();

    const { data, error: orderError } = await supabase.rpc(
      "create_marketplace_order",
      {
        p_listing_id: listing.listing_id,
        p_quantity: quantity,
        p_delivery_method: deliveryMethod,
        p_recipient_name:
          deliveryMethod === "shipping"
            ? String(formData.get("recipient_name") || "")
            : null,
        p_postal_code:
          deliveryMethod === "shipping"
            ? String(formData.get("postal_code") || "")
            : null,
        p_address_line:
          deliveryMethod === "shipping"
            ? String(formData.get("address_line") || "")
            : null,
        p_address_number:
          deliveryMethod === "shipping"
            ? String(formData.get("address_number") || "")
            : null,
        p_address_complement:
          deliveryMethod === "shipping"
            ? String(formData.get("address_complement") || "")
            : null,
        p_neighborhood:
          deliveryMethod === "shipping"
            ? String(formData.get("neighborhood") || "")
            : null,
        p_city:
          deliveryMethod === "shipping"
            ? String(formData.get("city") || "")
            : null,
        p_state:
          deliveryMethod === "shipping"
            ? String(formData.get("state") || "")
            : null,
        p_buyer_notes: String(formData.get("buyer_notes") || ""),
      },
    );

    if (orderError) {
      setError(orderError.message || "Não foi possível criar o pedido.");
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    router.push(`/orders?created=${data}`);
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <article className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
        <div className="flex justify-center bg-gradient-to-b from-blue-50 to-white p-6">
          <div className="flex aspect-[2.5/3.5] w-full max-w-[320px] items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
            {listing.front_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.front_image_url}
                alt={listing.card_name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-32 w-24 flex-col items-center justify-center rounded-xl border-2 border-blue-200 bg-blue-700 text-white">
                <span className="text-4xl font-black">M</span>
                <span className="mt-1 text-[10px] font-bold tracking-widest text-yellow-300">
                  TCG
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-blue-100 p-6">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
            Venda
          </span>

          <h2 className="mt-4 break-words text-2xl font-black text-[#071a4c]">
            {listing.title}
          </h2>

          <p className="mt-2 text-lg font-bold text-slate-700">
            {listing.card_name}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {listing.set_name || "Coleção não informada"}
            {listing.card_number ? ` · ${listing.card_number}` : ""}
          </p>

          <div className="mt-6 border-t border-blue-100 pt-5">
            <p className="text-3xl font-black text-emerald-600">
              {formatCurrency(Number(listing.price))}
            </p>

            <p className="mt-1 text-sm text-slate-500">por unidade</p>
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Disponível</dt>
              <dd className="mt-1 font-semibold text-[#071a4c]">
                {listing.quantity}{" "}
                {listing.quantity === 1 ? "unidade" : "unidades"}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Vendedor</dt>
              <dd className="mt-1 break-words font-semibold text-[#071a4c]">
                {listing.seller_display_name ||
                  listing.seller_username ||
                  "Master"}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Localização</dt>
              <dd className="mt-1 font-semibold text-[#071a4c]">
                {[listing.city, listing.state].filter(Boolean).join(" - ") ||
                  "Não informada"}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Envio</dt>
              <dd className="mt-1 font-semibold text-[#071a4c]">
                {listing.shipping_available
                  ? "Disponível"
                  : "A combinar com o vendedor"}
              </dd>
            </div>
          </dl>
        </div>
      </article>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-700">
            Resumo da compra
          </p>

          <h2 className="mt-3 text-2xl font-black text-[#071a4c]">
            Criar pedido
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            O vendedor receberá o pedido e deverá confirmar a disponibilidade. O
            pagamento será combinado diretamente entre vocês.
          </p>
        </div>

        <div className="mt-8">
          <label
            htmlFor="quantity"
            className="mb-2 block text-sm font-semibold text-[#071a4c]"
          >
            Quantidade
          </label>

          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={listing.quantity}
            value={quantity}
            onChange={(event) => {
              const nextQuantity = Number(event.target.value);

              setQuantity(
                Math.max(1, Math.min(listing.quantity, nextQuantity || 1)),
              );
            }}
            required
            className={fieldClass}
          />
        </div>

        <div className="mt-6">
          <label
            htmlFor="delivery_method"
            className="mb-2 block text-sm font-semibold text-[#071a4c]"
          >
            Forma de entrega
          </label>

          <select
            id="delivery_method"
            name="delivery_method"
            value={deliveryMethod}
            onChange={(event) => setDeliveryMethod(event.target.value)}
            className={fieldClass}
          >
            <option value="arranged">Combinar com o vendedor</option>
            <option value="pickup">Retirada em mãos</option>

            {listing.shipping_available && (
              <option value="shipping">Receber por envio</option>
            )}
          </select>
        </div>

        {deliveryMethod === "shipping" && (
          <fieldset className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <legend className="px-2 text-sm font-bold text-blue-700">
              Endereço de entrega
            </legend>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="recipient_name"
                  className="mb-2 block text-sm font-semibold text-[#071a4c]"
                >
                  Nome do destinatário
                </label>

                <input
                  id="recipient_name"
                  name="recipient_name"
                  type="text"
                  maxLength={120}
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="postal_code"
                  className="mb-2 block text-sm font-semibold text-[#071a4c]"
                >
                  CEP
                </label>

                <input
                  id="postal_code"
                  name="postal_code"
                  type="text"
                  maxLength={12}
                  placeholder="00000-000"
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="mb-2 block text-sm font-semibold text-[#071a4c]"
                >
                  Estado
                </label>

                <input
                  id="state"
                  name="state"
                  type="text"
                  maxLength={2}
                  placeholder="SP"
                  required
                  className={`${fieldClass} uppercase`}
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="address_line"
                  className="mb-2 block text-sm font-semibold text-[#071a4c]"
                >
                  Rua ou avenida
                </label>

                <input
                  id="address_line"
                  name="address_line"
                  type="text"
                  maxLength={180}
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="address_number"
                  className="mb-2 block text-sm font-semibold text-[#071a4c]"
                >
                  Número
                </label>

                <input
                  id="address_number"
                  name="address_number"
                  type="text"
                  maxLength={20}
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="address_complement"
                  className="mb-2 block text-sm font-semibold text-[#071a4c]"
                >
                  Complemento
                </label>

                <input
                  id="address_complement"
                  name="address_complement"
                  type="text"
                  maxLength={100}
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="neighborhood"
                  className="mb-2 block text-sm font-semibold text-[#071a4c]"
                >
                  Bairro
                </label>

                <input
                  id="neighborhood"
                  name="neighborhood"
                  type="text"
                  maxLength={100}
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="mb-2 block text-sm font-semibold text-[#071a4c]"
                >
                  Cidade
                </label>

                <input
                  id="city"
                  name="city"
                  type="text"
                  maxLength={120}
                  required
                  className={fieldClass}
                />
              </div>
            </div>
          </fieldset>
        )}

        <div className="mt-6">
          <label
            htmlFor="buyer_notes"
            className="mb-2 block text-sm font-semibold text-[#071a4c]"
          >
            Mensagem para o vendedor
          </label>

          <textarea
            id="buyer_notes"
            name="buyer_notes"
            rows={4}
            maxLength={500}
            placeholder="Ex.: Posso retirar no fim de semana."
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-600">
              {quantity} × {formatCurrency(Number(listing.price))}
            </span>

            <span className="text-sm font-semibold text-[#071a4c]">Total</span>
          </div>

          <p className="mt-2 text-right text-3xl font-black text-emerald-600">
            {formatCurrency(total)}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-yellow-400 px-5 py-4 text-sm font-black text-[#071a4c] shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Criando pedido..." : "Confirmar pedido"}
        </button>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          O MastersTCG não processa o pagamento nesta etapa. Combine pagamento,
          entrega e conferência da carta diretamente com o vendedor.
        </p>
      </form>
    </div>
  );
}
