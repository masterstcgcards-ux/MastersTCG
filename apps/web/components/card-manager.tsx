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
  quantity: number;
  card_condition: string;
  language: string;
  finish: string;
  notes: string | null;
  front_image_path: string | null;
};

type CardManagerProps = {
  card: CardData;
};

const conditions: Record<string, string> = {
  mint: "Impecável",
  near_mint: "Quase impecável",
  excellent: "Excelente",
  good: "Bom",
  played: "Com desgaste",
  poor: "Muito danificada",
};

const languages: Record<string, string> = {
  "pt-BR": "Português",
  en: "Inglês",
  ja: "Japonês",
  es: "Espanhol",
  other: "Outro",
};

const finishes: Record<string, string> = {
  normal: "Normal",
  holo: "Holográfica",
  reverse_holo: "Reverse holo",
  special: "Especial",
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/15 bg-[#181822] px-4 py-3 text-white outline-none focus:border-violet-400";

export function CardManager({ card }: CardManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = new FormData(event.currentTarget);
    const cardName = String(form.get("card_name") || "").trim();
    const quantity = Number(form.get("quantity"));

    if (!cardName) {
      setMessage("Informe o nome da carta.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      setMessage("A quantidade deve estar entre 1 e 999.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sua sessão expirou. Entre novamente.");
      }

      const { error } = await supabase
        .from("user_cards")
        .update({
          card_name: cardName,
          set_name: String(form.get("set_name") || "").trim() || null,
          card_number: String(form.get("card_number") || "").trim() || null,
          quantity,
          card_condition: String(form.get("card_condition")),
          language: String(form.get("language")),
          finish: String(form.get("finish")),
          notes: String(form.get("notes") || "").trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", card.id)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(`Não foi possível salvar: ${error.message}`);
      }

      setMessage("Alterações salvas com sucesso.");
      setEditing(false);
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
    const confirmed = window.confirm(
      `Deseja excluir "${card.card_name || "esta carta"}" da sua coleção?`,
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

      const { error } = await supabase
        .from("user_cards")
        .delete()
        .eq("id", card.id)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(`Não foi possível excluir: ${error.message}`);
      }

      if (card.front_image_path?.startsWith(`${user.id}/`)) {
        await supabase.storage
          .from("card-scans")
          .remove([card.front_image_path]);
      }

      router.replace("/collection");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
      );
      setDeleting(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#11111b] p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Coleção
            </p>
            <p className="mt-1 font-semibold">
              {card.set_name || "Não informada"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Número
            </p>
            <p className="mt-1 font-semibold">
              {card.card_number || "Não informado"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Conservação
            </p>
            <p className="mt-1 font-semibold">
              {conditions[card.card_condition] || "Não informada"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Quantidade
            </p>
            <p className="mt-1 font-semibold">{card.quantity}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Idioma
            </p>
            <p className="mt-1 font-semibold">
              {languages[card.language] || card.language}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Acabamento
            </p>
            <p className="mt-1 font-semibold">
              {finishes[card.finish] || card.finish}
            </p>
          </div>
        </div>

        {card.notes && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Observações
            </p>
            <p className="mt-2 whitespace-pre-wrap text-zinc-300">
              {card.notes}
            </p>
          </div>
        )}

        {message && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-300"
          >
            {message}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setEditing(true);
            }}
            className="rounded-xl bg-violet-600 px-5 py-3 font-bold hover:bg-violet-500"
          >
            Editar carta
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-xl border border-red-500/40 px-5 py-3 font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-60"
          >
            {deleting ? "Excluindo..." : "Excluir carta"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleUpdate}
      className="rounded-2xl border border-white/10 bg-[#11111b] p-6"
    >
      <fieldset disabled={saving} className="space-y-5 disabled:opacity-70">
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
              defaultValue={card.quantity}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="card_condition">Conservação *</label>
          <select
            id="card_condition"
            name="card_condition"
            required
            defaultValue={card.card_condition}
            className={fieldClass}
          >
            <option value="mint">Impecável</option>
            <option value="near_mint">Quase impecável</option>
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
              defaultValue={card.language}
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
              defaultValue={card.finish}
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
            rows={4}
            maxLength={2000}
            defaultValue={card.notes || ""}
            className={fieldClass}
          />
        </div>

        {message && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
          >
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-violet-600 px-5 py-3 font-bold hover:bg-violet-500"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setEditing(false);
            }}
            className="rounded-xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/5"
          >
            Cancelar
          </button>
        </div>
      </fieldset>
    </form>
  );
}
