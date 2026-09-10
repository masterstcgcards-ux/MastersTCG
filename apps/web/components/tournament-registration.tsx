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
    "mt-6 rounded-xl border border-white/10 bg-black/20 p-4";

  if (loading) {
    return (
      <div className={containerClass}>
        <p role="status" className="text-sm text-zinc-400">
          Consultando sua inscrição...
        </p>
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className={containerClass}>
        <p className="text-sm text-zinc-300">
          Entre na sua conta para consultar ou fazer uma inscrição.
        </p>

        <Link
          href="/auth/login"
          className="mt-3 inline-block font-semibold text-violet-300"
        >
          Entrar
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={containerClass}>
        <p role="alert" className="text-sm text-red-300">
          {loadError}
        </p>

        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          className="mt-3 text-sm font-semibold text-violet-300"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (registration) {
    return (
      <div className={containerClass}>
        <h4 className="font-bold">Sua inscrição</h4>

        <p role="status" className="mt-2 text-sm text-violet-300">
          {statusLabels[registration.status] || registration.status}
        </p>

        <p className="mt-2 break-words text-sm text-zinc-300">
          Deck: {registration.deck_name}
        </p>

        {registration.status === "pending" && (
          <p className="mt-3 text-xs text-zinc-400">
            Sua lista foi registrada e aguarda revisão. A inscrição ainda não
            representa aprovação para participar.
          </p>
        )}

        <p className="mt-3 text-xs text-zinc-500">
          Alterações posteriores no deck não modificam a lista enviada nesta
          inscrição.
        </p>

        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          className="mt-3 text-xs font-semibold text-violet-300"
        >
          Atualizar status
        </button>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className={containerClass}>
        <h4 className="font-bold">Inscrição</h4>

        <p className="mt-2 text-sm text-zinc-400">
          Você ainda não possui um deck Pokémon com o mesmo formato deste
          torneio.
        </p>

        <Link
          href="/decks"
          className="mt-3 inline-block text-sm font-semibold text-violet-300"
        >
          Ir para meus decks
        </Link>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <h4 className="font-bold">Inscrever meu deck</h4>

      <p className="mt-2 text-sm text-zinc-400">
        Escolha um deck do formato deste torneio. Ele precisa ter exatamente 60
        cartas e será submetido à revisão.
      </p>

      <label
        htmlFor={`registration-deck-${tournamentId}`}
        className="mt-4 block text-sm font-semibold"
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
        className="mt-2 block w-full rounded-xl border border-white/15 bg-[#171721] px-4 py-3 text-white outline-none focus:border-violet-500 disabled:opacity-50"
      >
        <option value="">Selecione um deck</option>

        {decks.map((deck) => (
          <option key={deck.id} value={deck.id}>
            {deck.name}
          </option>
        ))}
      </select>

      <p className="mt-3 text-xs text-zinc-500">
        Ao enviar, você compartilha a lista de cartas com a organização do
        torneio. Suas fotos privadas e observações pessoais não serão incluídas.
      </p>

      {submitError && (
        <div className="mt-4">
          <p role="alert" className="text-sm text-red-300">
            {submitError}
          </p>

          <button
            type="button"
            disabled={saving}
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-2 text-sm font-semibold text-violet-300 disabled:opacity-50"
          >
            Consultar inscrição
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={saving || !selectedDeckId}
        onClick={handleRegister}
        className="mt-4 w-full rounded-xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Enviando inscrição..." : "Enviar inscrição"}
      </button>
    </div>
  );
}
