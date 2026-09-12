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
  "mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-[#071a4c] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const labelClass = "font-bold text-[#071a4c]";

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
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Sua área de estratégias
          </p>

          <p className="mt-1 text-xl font-black text-[#071a4c]">
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
          className={`min-h-12 rounded-xl px-6 py-3 font-black transition ${
            showForm
              ? "border border-blue-200 bg-white text-[#071a4c] hover:bg-blue-50"
              : "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          }`}
        >
          {showForm ? "Cancelar" : "+ Criar novo deck"}
        </button>
      </div>

      {showForm && (
        <section className="mb-8 rounded-3xl border border-blue-200 bg-white p-6 shadow-xl shadow-blue-950/5 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
            <span aria-hidden="true">✦</span>
            Novo deck
          </span>

          <h2 className="mt-5 text-2xl font-black text-[#071a4c]">
            Monte sua estratégia
          </h2>

          <p className="mt-2 text-slate-500">
            Crie o deck e depois escolha as cartas da sua coleção.
          </p>

          <form
            onSubmit={handleCreateDeck}
            className="mt-7 grid gap-5 md:grid-cols-2"
          >
            <div>
              <label htmlFor="name" className={labelClass}>
                Nome do deck *
              </label>

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
              <label htmlFor="format" className={labelClass}>
                Formato
              </label>

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
              <label htmlFor="description" className={labelClass}>
                Descrição
              </label>

              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={500}
                placeholder="Descreva a estratégia ou a finalidade deste deck."
                className={fieldClass}
              />
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 md:col-span-2">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl text-blue-600">
                  ◆
                </span>

                <div>
                  <span className="block font-black text-[#071a4c]">
                    Deck privado
                  </span>

                  <span className="mt-1 block text-sm leading-relaxed text-slate-500">
                    Seu deck e as cartas adicionadas ficam visíveis apenas para
                    você.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
            >
              {saving ? "Criando deck..." : "Criar deck"}
            </button>
          </form>
        </section>
      )}

      {message && (
        <p
          role={success ? "status" : "alert"}
          className={`mb-8 rounded-xl border p-4 text-sm font-semibold ${
            success
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      )}

      {decks.length === 0 ? (
        <section className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-white p-8 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-4xl text-blue-600">
            ◫
          </div>

          <h2 className="mt-6 text-2xl font-black text-[#071a4c]">
            Seu primeiro deck começa aqui
          </h2>

          <p className="mt-3 max-w-md leading-relaxed text-slate-600">
            Crie um deck Pokémon e depois escolha quais cartas da sua coleção
            farão parte dele.
          </p>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-7 min-h-12 rounded-xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Criar primeiro deck
          </button>
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <article
              key={deck.id}
              className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-950/10"
            >
              <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-500 to-amber-400" />

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#071a4c] text-2xl font-black text-white shadow-lg shadow-blue-950/20">
                    M
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      deck.is_public
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {deck.is_public ? "Público" : "Privado"}
                  </span>
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                  Pokémon TCG
                </p>

                <h2 className="mt-2 break-words text-2xl font-black text-[#071a4c]">
                  {deck.name}
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {deck.format
                    ? `Formato: ${deck.format}`
                    : "Formato não informado"}
                </p>

                {deck.description && (
                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600">
                    {deck.description}
                  </p>
                )}

                <div className="mt-6 rounded-2xl bg-blue-50/70 p-4">
                  <p className="font-black text-[#071a4c]">
                    <span className="text-2xl text-blue-600">
                      {deck.cardCount}
                    </span>{" "}
                    {deck.cardCount === 1 ? "carta" : "cartas"} no deck
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/decks/${deck.id}`}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-700"
                  >
                    Montar deck
                  </Link>

                  <button
                    type="button"
                    disabled={deletingId === deck.id}
                    onClick={() => handleDeleteDeck(deck)}
                    className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingId === deck.id ? "Excluindo..." : "Excluir"}
                  </button>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Abra o deck para adicionar, remover e organizar suas cartas.
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
