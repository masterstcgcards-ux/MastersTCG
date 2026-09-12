"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

type CardData = {
  id: string;
  card_name: string | null;
  set_name: string | null;
  card_number: string | null;
  quantity: number | null;
  card_condition: string | null;
  language: string | null;
  finish: string | null;
  notes: string | null;
  front_image_path: string | null;
  back_image_path: string | null;
};

type CardManagerProps = {
  card: CardData;
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-[#071a4c] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const labelClass = "font-bold text-[#071a4c]";

const conditionLabels: Record<string, string> = {
  mint: "Impecável (Mint)",
  near_mint: "Quase impecável (Near Mint)",
  excellent: "Excelente",
  good: "Bom",
  played: "Com desgaste",
  poor: "Muito danificada",
};

const languageLabels: Record<string, string> = {
  "pt-BR": "Português",
  en: "Inglês",
  ja: "Japonês",
  es: "Espanhol",
  other: "Outro",
};

const finishLabels: Record<string, string> = {
  normal: "Normal",
  holo: "Holográfica",
  reverse_holo: "Reverse holo",
  special: "Especial",
};

export function CardManager({ card: initialCard }: CardManagerProps) {
  const router = useRouter();
  const [card, setCard] = useState(initialCard);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || deleting) return;

    setMessage("");
    setSaving(true);

    const form = new FormData(event.currentTarget);
    const cardName = String(form.get("card_name") || "").trim();
    const quantity = Number(form.get("quantity"));

    if (!cardName) {
      setMessage("Informe o nome da carta.");
      setSaving(false);
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      setMessage("A quantidade deve ser um número inteiro entre 1 e 999.");
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sua sessão expirou. Entre novamente.");
      }

      const updatedCard = {
        card_name: cardName,
        set_name: String(form.get("set_name") || "").trim() || null,
        card_number: String(form.get("card_number") || "").trim() || null,
        quantity,
        card_condition: String(form.get("card_condition")),
        language: String(form.get("language")),
        finish: String(form.get("finish")),
        notes: String(form.get("notes") || "").trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_cards")
        .update(updatedCard)
        .eq("id", card.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(`Não foi possível salvar: ${error.message}`);
      }

      if (!data) {
        throw new Error("A carta não foi encontrada na sua coleção.");
      }

      setCard((currentCard) => ({
        ...currentCard,
        ...updatedCard,
      }));

      setEditing(false);
      setMessage("Alterações salvas com sucesso.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (saving || deleting) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir ${card.card_name || "esta carta"}? Essa ação não poderá ser desfeita.`,
    );

    if (!confirmed) return;

    setMessage("");
    setDeleting(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sua sessão expirou. Entre novamente.");
      }

      const { data, error: deleteError } = await supabase
        .from("user_cards")
        .delete()
        .eq("id", card.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (deleteError) {
        throw new Error(
          `Não foi possível excluir a carta: ${deleteError.message}`,
        );
      }

      if (!data) {
        throw new Error("A carta não foi encontrada na sua coleção.");
      }

      const imagePaths = [card.front_image_path, card.back_image_path].filter(
        (path): path is string =>
          Boolean(path) && path!.startsWith(`${user.id}/`),
      );

      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("card-scans")
          .remove(imagePaths);

        if (storageError) {
          console.error(
            "A carta foi excluída, mas não foi possível remover todas as fotos:",
            storageError,
          );
        }
      }

      router.push("/collection");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
      );

      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
            Editar carta
          </span>

          <h2 className="mt-4 text-2xl font-black text-[#071a4c]">
            Atualize os dados
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            As alterações serão aplicadas somente nesta carta.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label htmlFor="card_name" className={labelClass}>
              Nome da carta *
            </label>

            <input
              id="card_name"
              name="card_name"
              required
              maxLength={150}
              defaultValue={card.card_name || ""}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="set_name" className={labelClass}>
              Coleção / expansão
            </label>

            <input
              id="set_name"
              name="set_name"
              maxLength={150}
              defaultValue={card.set_name || ""}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="card_number" className={labelClass}>
                Número
              </label>

              <input
                id="card_number"
                name="card_number"
                maxLength={30}
                defaultValue={card.card_number || ""}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="quantity" className={labelClass}>
                Quantidade *
              </label>

              <input
                id="quantity"
                name="quantity"
                type="number"
                min={1}
                max={999}
                step={1}
                required
                defaultValue={card.quantity ?? 1}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="card_condition" className={labelClass}>
              Estado de conservação *
            </label>

            <select
              id="card_condition"
              name="card_condition"
              required
              defaultValue={card.card_condition || ""}
              className={fieldClass}
            >
              <option value="" disabled>
                Selecione o estado
              </option>
              <option value="mint">Impecável (Mint)</option>
              <option value="near_mint">Quase impecável (Near Mint)</option>
              <option value="excellent">Excelente</option>
              <option value="good">Bom</option>
              <option value="played">Com desgaste</option>
              <option value="poor">Muito danificada</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="language" className={labelClass}>
                Idioma
              </label>

              <select
                id="language"
                name="language"
                defaultValue={card.language || "pt-BR"}
                className={fieldClass}
              >
                <option value="pt-BR">Português</option>
                <option value="en">Inglês</option>
                <option value="ja">Japonês</option>
                <option value="es">Espanhol</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div>
              <label htmlFor="finish" className={labelClass}>
                Acabamento
              </label>

              <select
                id="finish"
                name="finish"
                defaultValue={card.finish || "normal"}
                className={fieldClass}
              >
                <option value="normal">Normal</option>
                <option value="holo">Holográfica</option>
                <option value="reverse_holo">Reverse holo</option>
                <option value="special">Especial</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className={labelClass}>
              Observações
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={5}
              maxLength={1000}
              defaultValue={card.notes || ""}
              className={fieldClass}
            />
          </div>

          {message && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
            >
              {message}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setMessage("");
              }}
              className="min-h-12 rounded-xl border border-blue-200 bg-white px-6 py-3 font-bold text-[#071a4c] transition hover:border-blue-500 hover:bg-blue-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            Dados da carta
          </p>

          <h2 className="mt-2 break-words text-3xl font-black text-[#071a4c]">
            {card.card_name || "Carta sem nome"}
          </h2>
        </div>

        <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-600">
          {card.quantity ?? 1}x
        </span>
      </div>

      <dl className="mt-8 divide-y divide-blue-100">
        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-slate-500">Coleção</dt>
          <dd className="break-words text-right font-bold text-[#071a4c]">
            {card.set_name || "Não informada"}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-slate-500">Número</dt>
          <dd className="break-words text-right font-bold text-[#071a4c]">
            {card.card_number || "Não informado"}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-slate-500">Quantidade</dt>
          <dd className="text-right font-bold text-blue-600">
            {card.quantity ?? 1}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-slate-500">Conservação</dt>
          <dd className="break-words text-right font-bold text-[#071a4c]">
            {card.card_condition
              ? conditionLabels[card.card_condition] || card.card_condition
              : "Não informada"}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-slate-500">Idioma</dt>
          <dd className="text-right font-bold text-[#071a4c]">
            {card.language
              ? languageLabels[card.language] || card.language
              : "Não informado"}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-slate-500">Acabamento</dt>
          <dd className="text-right font-bold text-[#071a4c]">
            {card.finish
              ? finishLabels[card.finish] || card.finish
              : "Não informado"}
          </dd>
        </div>
      </dl>

      {card.notes && (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <p className="text-sm font-black text-blue-600">Observações</p>
          <p className="mt-2 whitespace-pre-wrap text-slate-700">
            {card.notes}
          </p>
        </div>
      )}

      {message && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700"
        >
          {message}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setMessage("");
          }}
          className="min-h-12 flex-1 rounded-xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          Editar
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="min-h-12 rounded-xl border border-red-200 bg-white px-6 py-3 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {deleting ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </section>
  );
}
