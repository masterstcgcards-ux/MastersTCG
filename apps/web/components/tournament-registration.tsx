"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type TournamentRegistrationProps = {
  tournamentId: string;
  tournamentFormat: string;
};

type DeckOption = {
  id: string;
  name: string;
  format: string | null;
};

type Registration = {
  id: string;
  status: string;
  deck_name: string;
};

const statusLabels: Record<string, string> = {
  pending: "Pendente de revisão",
  confirmed: "Confirmada",
  rejected: "Não aprovada",
  cancelled: "Cancelada",
};

const statusStyles: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-600",
};

export function TournamentRegistration({
  tournamentId,
  tournamentFormat,
}: TournamentRegistrationProps) {
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [registration, setRegistration] = useState<Registration | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const submitting = useRef(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError("");
      setSubmitError("");
      setNeedsLogin(false);
      setRegistration(null);
      setDecks([]);
      setSelectedDeckId("");

      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (active) setNeedsLogin(true);
          return;
        }

        const { data: existing, error: registrationError } = await supabase
          .from("tournament_registrations")
          .select("id, status, deck_name")
          .eq("tournament_id", tournamentId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (registrationError) {
          throw new Error("Não foi possível consultar sua inscrição.");
        }

        if (existing) {
          if (active) setRegistration(existing);
          return;
        }

        const { data: availableDecks, error: decksError } = await supabase
          .from("decks")
          .select("id, name, format")
          .eq("user_id", user.id)
          .eq("game_slug", "pokemon")
          .eq("format", tournamentFormat)
          .order("name", { ascending: true });

        if (decksError) {
          throw new Error("Não foi possível carregar seus decks.");
        }

        if (active) {
          setDecks(availableDecks ?? []);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a inscrição.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [tournamentId, tournamentFormat, reloadKey]);

  async function handleRegister() {
    if (submitting.current || loading || registration || !selectedDeckId) {
      return;
    }

    submitting.current = true;
    setSaving(true);
    setSubmitError("");

    try {
      const supabase = createClient();

      const { data: registrationId, error: rpcError } = await supabase.rpc(
        "register_for_tournament",
        {
          p_tournament_id: tournamentId,
          p_deck_id: selectedDeckId,
        },
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (typeof registrationId !== "string") {
        throw new Error(
          "Não recebemos a confirmação. Clique em Consultar inscrição antes de tentar novamente.",
        );
      }

      const selectedDeck = decks.find((deck) => deck.id === selectedDeckId);

      setRegistration({
        id: registrationId,
        status: "pending",
        deck_name: selectedDeck?.name || "Deck inscrito",
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar a inscrição. Consulte o status antes de tentar novamente.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  const containerClass =
    "mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5";

  if (loading) {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" />

          <p role="status" className="text-sm font-semibold text-slate-600">
            Consultando sua inscrição...
          </p>
        </div>
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className={containerClass}>
        <p className="text-sm text-slate-600">
          Entre na sua conta para consultar ou fazer uma inscrição.
        </p>

        <Link
          href="/auth/login"
          className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          Entrar
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
        <p role="alert" className="text-sm font-semibold text-red-700">
          {loadError}
        </p>

        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (registration) {
    return (
      <div className={containerClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-black text-[#071a4c]">Sua inscrição</h4>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              statusStyles[registration.status] ||
              "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {statusLabels[registration.status] || registration.status}
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Deck enviado
          </p>

          <p className="mt-1 break-words font-bold text-[#071a4c]">
            {registration.deck_name}
          </p>
        </div>

        {registration.status === "pending" && (
          <p className="mt-4 text-xs leading-relaxed text-amber-800">
            Sua lista foi registrada e aguarda revisão. A inscrição ainda não
            representa aprovação para participar.
          </p>
        )}

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Alterações posteriores no deck não modificam a lista enviada nesta
          inscrição.
        </p>

        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          className="mt-4 text-xs font-bold text-blue-700 transition hover:text-blue-800"
        >
          Atualizar status
        </button>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className={containerClass}>
        <h4 className="font-black text-[#071a4c]">Inscrição</h4>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Você ainda não possui um deck Pokémon com o mesmo formato deste
          torneio.
        </p>

        <Link
          href="/decks"
          className="mt-4 inline-flex rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
        >
          Ir para meus decks
        </Link>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-black text-white">
        ✓
      </div>

      <h4 className="mt-4 font-black text-[#071a4c]">Inscrever meu deck</h4>

      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Escolha um deck do formato deste torneio. Ele precisa ter exatamente 60
        cartas e será submetido à revisão.
      </p>

      <label
        htmlFor={`registration-deck-${tournamentId}`}
        className="mt-4 block text-sm font-bold text-[#071a4c]"
      >
        Meu deck
      </label>

      <select
        id={`registration-deck-${tournamentId}`}
        value={selectedDeckId}
        disabled={saving}
        onChange={(event) => {
          setSelectedDeckId(event.target.value);
          setSubmitError("");
        }}
        className="mt-2 block w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
      >
        <option value="">Selecione um deck</option>

        {decks.map((deck) => (
          <option key={deck.id} value={deck.id}>
            {deck.name}
          </option>
        ))}
      </select>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Ao enviar, você compartilha a lista de cartas com a organização do
        torneio. Suas fotos privadas e observações pessoais não serão incluídas.
      </p>

      {submitError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p role="alert" className="text-sm font-semibold text-red-700">
            {submitError}
          </p>

          <button
            type="button"
            disabled={saving}
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-3 text-sm font-bold text-red-700 disabled:opacity-50"
          >
            Consultar inscrição
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={saving || !selectedDeckId}
        onClick={handleRegister}
        className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Enviando inscrição..." : "Enviar inscrição"}
      </button>
    </div>
  );
}
