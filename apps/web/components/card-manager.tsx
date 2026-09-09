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
  "mt-2 w-full rounded-xl border border-white/15 bg-[#181822] px-4 py-3 text-white outline-none focus:border-violet-400";

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
      <section className="rounded-3xl border border-white/10 bg-[#13131d] p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
            Editar carta
          </p>

          <h2 className="mt-2 text-2xl font-black">Atualize os dados</h2>
        </div>

        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label htmlFor="card_name">Nome da carta *</label>

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
            <label htmlFor="set_name">Coleção / expansão</label>

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
              <label htmlFor="card_number">Número</label>

              <input
                id="card_number"
                name="card_number"
                maxLength={30}
                defaultValue={card.card_number || ""}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="quantity">Quantidade *</label>

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
            <label htmlFor="card_condition">Estado de conservação *</label>

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
              <label htmlFor="language">Idioma</label>

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
              <label htmlFor="finish">Acabamento</label>

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
            <label htmlFor="notes">Observações</label>

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
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
            >
              {message}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500 disabled:opacity-60"
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
              className="rounded-xl border border-white/15 px-6 py-3 font-bold text-zinc-300 hover:border-white/30 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[#13131d] p-6 sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
        Dados da carta
      </p>

      <h2 className="mt-2 text-3xl font-black">
        {card.card_name || "Carta sem nome"}
      </h2>

      <dl className="mt-8 divide-y divide-white/10">
        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-zinc-500">Coleção</dt>
          <dd className="text-right font-semibold">
            {card.set_name || "Não informada"}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-zinc-500">Número</dt>
          <dd className="text-right font-semibold">
            {card.card_number || "Não informado"}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-zinc-500">Quantidade</dt>
          <dd className="text-right font-semibold">{card.quantity ?? 1}</dd>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-zinc-500">Conservação</dt>
          <dd className="text-right font-semibold">
            {card.card_condition
              ? conditionLabels[card.card_condition] || card.card_condition
              : "Não informada"}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-zinc-500">Idioma</dt>
          <dd className="text-right font-semibold">
            {card.language
              ? languageLabels[card.language] || card.language
              : "Não informado"}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <dt className="text-zinc-500">Acabamento</dt>
          <dd className="text-right font-semibold">
            {card.finish
              ? finishLabels[card.finish] || card.finish
              : "Não informado"}
          </dd>
        </div>
      </dl>

      {card.notes && (
        <div className="mt-6 rounded-2xl bg-white/[0.035] p-5">
          <p className="text-sm font-bold text-zinc-400">Observações</p>
          <p className="mt-2 whitespace-pre-wrap text-zinc-200">{card.notes}</p>
        </div>
      )}

      {message && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200"
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
          className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500"
        >
          Editar
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="rounded-xl border border-red-500/40 px-6 py-3 font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
        >
          {deleting ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </section>
  );
}
