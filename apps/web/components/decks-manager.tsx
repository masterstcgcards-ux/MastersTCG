"use client";
import Link from "next/link";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

type DeckData = {
  id: string;
  name: string;
  game_slug: string;
  format: string | null;
  description: string | null;
  is_public: boolean;
  created_at: string;
  cardCount: number;
};

type DecksManagerProps = {
  initialDecks: DeckData[];
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/15 bg-[#181822] px-4 py-3 text-white outline-none transition focus:border-violet-400";

export function DecksManager({ initialDecks }: DecksManagerProps) {
  const router = useRouter();
  const [decks, setDecks] = useState(initialDecks);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleCreateDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (saving) return;

    setSaving(true);
    setMessage("");
    setSuccess(false);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const format = String(form.get("format") || "").trim();
    const description = String(form.get("description") || "").trim();
    const isPublic = form.get("is_public") === "on";

    if (name.length < 2 || name.length > 100) {
      setMessage("O nome do deck deve ter entre 2 e 100 caracteres.");
      setSaving(false);
      return;
    }

    if (description.length > 500) {
      setMessage("A descrição deve ter no máximo 500 caracteres.");
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

      const { data: newDeck, error: insertError } = await supabase
        .from("decks")
        .insert({
          user_id: user.id,
          name,
          game_slug: "pokemon",
          format: format || null,
          description: description || null,
          is_public: isPublic,
        })
        .select(
          `
            id,
            name,
            game_slug,
            format,
            description,
            is_public,
            created_at
            `,
        )
        .single();

      if (insertError) {
        throw new Error(
          `Não foi possível criar o deck: ${insertError.message}`,
        );
      }

      setDecks((currentDecks) => [
        {
          ...newDeck,
          cardCount: 0,
        },
        ...currentDecks,
      ]);

      formElement.reset();
      setShowForm(false);
      setSuccess(true);
      setMessage("Deck criado com sucesso.");
      router.refresh();
    } catch (error) {
      setSuccess(false);
      setMessage(
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDeck(deck: DeckData) {
    if (deletingId) return;

    const confirmed = window.confirm(
      `Deseja excluir o deck "${deck.name}"? As cartas serão removidas do deck, mas continuarão na sua coleção.`,
    );

    if (!confirmed) return;

    setDeletingId(deck.id);
    setMessage("");
    setSuccess(false);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sua sessão expirou. Entre novamente.");
      }

      const { data: deletedDeck, error: deleteError } = await supabase
        .from("decks")
        .delete()
        .eq("id", deck.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (deleteError) {
        throw new Error(
          `Não foi possível excluir o deck: ${deleteError.message}`,
        );
      }

      if (!deletedDeck) {
        throw new Error("O deck não foi encontrado.");
      }

      setDecks((currentDecks) =>
        currentDecks.filter((currentDeck) => currentDeck.id !== deck.id),
      );

      setSuccess(true);
      setMessage("Deck excluído com sucesso.");
      router.refresh();
    } catch (error) {
      setSuccess(false);
      setMessage(
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-zinc-400">
            {decks.length}{" "}
            {decks.length === 1 ? "deck cadastrado" : "decks cadastrados"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((currentValue) => !currentValue);
            setMessage("");
          }}
          className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500"
        >
          {showForm ? "Cancelar" : "Criar novo deck"}
        </button>
      </div>

      {showForm && (
        <section className="mb-8 rounded-3xl border border-violet-500/30 bg-[#13131d] p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
            Novo deck
          </p>

          <h2 className="mt-2 text-2xl font-black">Monte sua estratégia</h2>

          <form
            onSubmit={handleCreateDeck}
            className="mt-7 grid gap-5 md:grid-cols-2"
          >
            <div>
              <label htmlFor="name">Nome do deck *</label>

              <input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Ex.: Deck elétrico"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="format">Formato</label>

              <select
                id="format"
                name="format"
                defaultValue="standard"
                className={fieldClass}
              >
                <option value="standard">Padrão</option>
                <option value="expanded">Expandido</option>
                <option value="unlimited">Ilimitado</option>
                <option value="casual">Casual</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description">Descrição</label>

              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={500}
                placeholder="Descreva a estratégia ou a finalidade deste deck."
                className={fieldClass}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 md:col-span-2">
              <input
                type="checkbox"
                name="is_public"
                className="h-5 w-5 accent-violet-600"
              />

              <span>
                <span className="block font-semibold">Deck público</span>

                <span className="text-sm text-zinc-500">
                  A publicação para outros usuários será ativada em uma próxima
                  etapa.
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
            >
              {saving ? "Criando deck..." : "Criar deck"}
            </button>
          </form>
        </section>
      )}

      {message && (
        <p
          role={success ? "status" : "alert"}
          className={`mb-8 rounded-xl border p-4 text-sm ${
            success
              ? "border-green-500/30 bg-green-500/10 text-green-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {message}
        </p>
      )}

      {decks.length === 0 ? (
        <section className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-500/10 text-4xl">
            ◫
          </div>

          <h2 className="mt-6 text-2xl font-bold">
            Seu primeiro deck começa aqui
          </h2>

          <p className="mt-3 max-w-md text-zinc-400">
            Crie um deck Pokémon e depois escolha quais cartas da sua coleção
            farão parte dele.
          </p>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-7 rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500"
          >
            Criar primeiro deck
          </button>
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <article
              key={deck.id}
              className="rounded-3xl border border-white/10 bg-[#13131d] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-black">
                  M
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    deck.is_public
                      ? "bg-green-500/10 text-green-300"
                      : "bg-zinc-500/10 text-zinc-400"
                  }`}
                >
                  {deck.is_public ? "Público" : "Privado"}
                </span>
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
                Pokémon TCG
              </p>

              <h2 className="mt-2 text-2xl font-black">{deck.name}</h2>

              <p className="mt-2 text-sm text-zinc-400">
                {deck.format
                  ? `Formato: ${deck.format}`
                  : "Formato não informado"}
              </p>

              {deck.description && (
                <p className="mt-4 line-clamp-3 text-sm text-zinc-300">
                  {deck.description}
                </p>
              )}

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="font-semibold">
                  {deck.cardCount} {deck.cardCount === 1 ? "carta" : "cartas"}{" "}
                  no deck
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/decks/${deck.id}`}
                  className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-violet-500"
                >
                  Montar deck
                </Link>
                <button
                  type="button"
                  disabled={deletingId === deck.id}
                  onClick={() => handleDeleteDeck(deck)}
                  className="rounded-xl border border-red-500/40 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                >
                  {deletingId === deck.id ? "Excluindo..." : "Excluir"}
                </button>
              </div>

              <p className="mt-3 text-xs text-zinc-600">
                A seleção de cartas será ativada na próxima etapa.
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
