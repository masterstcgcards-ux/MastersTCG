"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export type Tournament = {
  id: string;
  name: string;
  description: string;
  game_slug: string;
  format: string;
  status: string;
  starts_at: string;
  registration_deadline: string | null;
  max_players: number;
  location: string;
  rules: string;
  prizes_description: string;
  created_at: string;
};

type TournamentsManagerProps = {
  initialTournaments: Tournament[];
  isAdmin: boolean;
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  in_progress: "Em andamento",
  completed: "Encerrado",
  cancelled: "Cancelado",
};

const formatLabels: Record<string, string> = {
  standard: "Padrão",
  expanded: "Expandido",
  casual: "Casual",
};

const statusStyles: Record<string, string> = {
  draft: "bg-zinc-500/15 text-zinc-300",
  published: "bg-violet-500/15 text-violet-300",
  in_progress: "bg-green-500/15 text-green-300",
  completed: "bg-blue-500/15 text-blue-300",
  cancelled: "bg-red-500/15 text-red-300",
};

const tournamentColumns = `
  id,
  name,
  description,
  game_slug,
  format,
  status,
  starts_at,
  registration_deadline,
  max_players,
  location,
  rules,
  prizes_description,
  created_at
`;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

// Os campos do formulário usam o horário de Brasília.
function parseBrasiliaDate(value: string) {
  if (!value) return null;

  const date = new Date(`${value}:00-03:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function TournamentsManager({
  initialTournaments,
  isAdmin,
}: TournamentsManagerProps) {
  const router = useRouter();
  const submitting = useRef(false);

  const [tournaments, setTournaments] = useState(initialTournaments);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const busy = saving || updatingId !== null;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin || submitting.current) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setMessage("");
    setError("");

    const name = String(form.get("name") || "").trim();
    const format = String(form.get("format") || "");
    const startsAt = parseBrasiliaDate(String(form.get("starts_at") || ""));
    const deadlineValue = String(form.get("registration_deadline") || "");
    const deadline = parseBrasiliaDate(deadlineValue);
    const maxPlayers = Number(form.get("max_players"));

    if (name.length < 3 || name.length > 150) {
      setError("O nome deve ter entre 3 e 150 caracteres.");
      return;
    }

    if (!["standard", "expanded", "casual"].includes(format)) {
      setError("Selecione um formato válido.");
      return;
    }

    if (!startsAt || startsAt.getTime() <= Date.now()) {
      setError("Informe uma data de início futura.");
      return;
    }

    if (
      deadlineValue &&
      (!deadline ||
        deadline.getTime() <= Date.now() ||
        deadline.getTime() > startsAt.getTime())
    ) {
      setError(
        "O prazo de inscrição deve estar no futuro e não pode ser posterior ao início.",
      );
      return;
    }

    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 1024) {
      setError("Informe entre 2 e 1024 participantes.");
      return;
    }

    submitting.current = true;
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

      const { data, error: insertError } = await supabase
        .from("tournaments")
        .insert({
          created_by: user.id,
          name,
          description: String(form.get("description") || "").trim(),
          game_slug: "pokemon",
          format,
          status: "draft",
          starts_at: startsAt.toISOString(),
          registration_deadline: deadline ? deadline.toISOString() : null,
          max_players: maxPlayers,
          location: String(form.get("location") || "").trim(),
          rules: String(form.get("rules") || "").trim(),
          prizes_description: String(
            form.get("prizes_description") || "",
          ).trim(),
        })
        .select(tournamentColumns)
        .single();

      if (insertError) throw new Error(insertError.message);
      if (!data) throw new Error("O cadastro não foi confirmado.");

      setTournaments((current) => [data as Tournament, ...current]);

      formElement.reset();
      setMessage(
        "Torneio criado como rascunho. Confira os dados antes de publicar.",
      );
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Não foi possível cadastrar o torneio.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  async function changeStatus(
    tournament: Tournament,
    nextStatus: "published" | "cancelled",
  ) {
    if (!isAdmin || submitting.current) return;

    setMessage("");
    setError("");

    if (nextStatus === "published") {
      if (tournament.status !== "draft") return;

      if (new Date(tournament.starts_at).getTime() <= Date.now()) {
        setError(
          "Este torneio está com a data de início vencida e não pode ser publicado.",
        );
        return;
      }

      if (
        tournament.registration_deadline &&
        new Date(tournament.registration_deadline).getTime() <= Date.now()
      ) {
        setError("O prazo de inscrição deste torneio já venceu.");
        return;
      }
    }

    if (nextStatus === "cancelled") {
      if (["cancelled", "completed"].includes(tournament.status)) {
        return;
      }

      const confirmed = window.confirm(
        `Cancelar o torneio "${tournament.name}"? O histórico será mantido.`,
      );

      if (!confirmed) return;
    }

    submitting.current = true;
    setUpdatingId(tournament.id);

    try {
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from("tournaments")
        .update({ status: nextStatus })
        .eq("id", tournament.id)
        .eq("status", tournament.status)
        .select(tournamentColumns)
        .maybeSingle();

      if (updateError) throw new Error(updateError.message);

      if (!data) {
        throw new Error(
          "A atualização não foi confirmada. Recarregue a página e confira suas permissões.",
        );
      }

      setTournaments((current) =>
        current.map((item) =>
          item.id === tournament.id ? (data as Tournament) : item,
        ),
      );

      setMessage(
        nextStatus === "published"
          ? "Torneio publicado. As inscrições ainda não estão disponíveis nesta versão."
          : "Torneio cancelado. O histórico foi mantido.",
      );

      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar o torneio.",
      );
    } finally {
      submitting.current = false;
      setUpdatingId(null);
    }
  }

  const fieldClass =
    "mt-2 block w-full rounded-xl border border-white/15 bg-[#171721] px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-violet-500";

  return (
    <div className="space-y-8">
      {isAdmin && (
        <section className="rounded-2xl border border-violet-500/25 bg-[#11111b] p-6">
          <h2 className="text-2xl font-black">Criar torneio</h2>

          <p className="mt-2 text-sm text-zinc-400">
            Área administrativa. Todo novo torneio começa como rascunho, visível
            apenas para administradores.
          </p>

          <form onSubmit={handleCreate} className="mt-6">
            <fieldset
              disabled={busy}
              className="grid min-w-0 gap-5 disabled:opacity-60 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <label htmlFor="tournament-name">Nome do torneio *</label>
                <input
                  id="tournament-name"
                  name="name"
                  required
                  minLength={3}
                  maxLength={150}
                  placeholder="Ex.: Copa Masters Pokémon"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="tournament-format">Formato *</label>
                <select
                  id="tournament-format"
                  name="format"
                  defaultValue="standard"
                  className={fieldClass}
                >
                  <option value="standard">Padrão</option>
                  <option value="expanded">Expandido</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              <div>
                <label htmlFor="tournament-capacity">
                  Limite de participantes *
                </label>
                <input
                  id="tournament-capacity"
                  name="max_players"
                  type="number"
                  min={2}
                  max={1024}
                  step={1}
                  defaultValue={32}
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="tournament-start">
                  Início — horário de Brasília *
                </label>
                <input
                  id="tournament-start"
                  name="starts_at"
                  type="datetime-local"
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="tournament-deadline">
                  Prazo de inscrição — horário de Brasília
                </label>
                <input
                  id="tournament-deadline"
                  name="registration_deadline"
                  type="datetime-local"
                  className={fieldClass}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="tournament-location">Local ou modalidade</label>
                <input
                  id="tournament-location"
                  name="location"
                  maxLength={300}
                  placeholder="Ex.: São Caetano do Sul — local a confirmar"
                  className={fieldClass}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="tournament-description">Descrição</label>
                <textarea
                  id="tournament-description"
                  name="description"
                  rows={3}
                  maxLength={5000}
                  className={fieldClass}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="tournament-rules">Regulamento</label>
                <textarea
                  id="tournament-rules"
                  name="rules"
                  rows={4}
                  maxLength={10000}
                  placeholder="Informe as condições de participação."
                  className={fieldClass}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="tournament-prizes">Premiação</label>
                <textarea
                  id="tournament-prizes"
                  name="prizes_description"
                  rows={2}
                  maxLength={3000}
                  placeholder="Descreva somente prêmios confirmados."
                  className={fieldClass}
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed md:col-span-2"
              >
                {saving ? "Salvando..." : "Criar rascunho"}
              </button>
            </fieldset>
          </form>
        </section>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
        >
          {error}
        </div>
      )}

      <section>
        <h2 className="text-2xl font-black">
          {isAdmin ? "Gerenciar torneios" : "Torneios"}
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          As inscrições serão disponibilizadas em uma próxima etapa.
        </p>

        {tournaments.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center text-zinc-400">
            {isAdmin
              ? "Nenhum torneio cadastrado. Crie o primeiro rascunho acima."
              : "Nenhum torneio publicado no momento."}
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {tournaments.map((tournament) => {
              const updating = updatingId === tournament.id;

              return (
                <article
                  key={tournament.id}
                  className="min-w-0 rounded-2xl border border-white/10 bg-[#13131d] p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
                      Pokémon TCG
                    </p>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        statusStyles[tournament.status] || statusStyles.draft
                      }`}
                    >
                      {statusLabels[tournament.status] || tournament.status}
                    </span>
                  </div>

                  <h3 className="mt-4 break-words text-2xl font-black">
                    {tournament.name}
                  </h3>

                  {tournament.description && (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-400">
                      {tournament.description}
                    </p>
                  )}

                  <dl className="mt-5 space-y-3 text-sm">
                    <div>
                      <dt className="text-zinc-500">Formato</dt>
                      <dd>
                        {formatLabels[tournament.format] || tournament.format}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-zinc-500">Início — Brasília</dt>
                      <dd>{formatDate(tournament.starts_at)}</dd>
                    </div>

                    {tournament.registration_deadline && (
                      <div>
                        <dt className="text-zinc-500">
                          Prazo de inscrição — Brasília
                        </dt>
                        <dd>{formatDate(tournament.registration_deadline)}</dd>
                      </div>
                    )}

                    <div>
                      <dt className="text-zinc-500">Capacidade</dt>
                      <dd>Até {tournament.max_players} participantes</dd>
                    </div>

                    <div>
                      <dt className="text-zinc-500">Local</dt>
                      <dd className="break-words">
                        {tournament.location || "A confirmar"}
                      </dd>
                    </div>
                  </dl>

                  {tournament.prizes_description && (
                    <div className="mt-5 rounded-xl bg-violet-500/10 p-4">
                      <h4 className="font-bold text-violet-300">Premiação</h4>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-300">
                        {tournament.prizes_description}
                      </p>
                    </div>
                  )}

                  {tournament.rules && (
                    <details className="mt-5 rounded-xl border border-white/10 p-4">
                      <summary className="cursor-pointer font-semibold">
                        Ver regulamento
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-400">
                        {tournament.rules}
                      </p>
                    </details>
                  )}

                  {isAdmin && (
                    <div className="mt-6 flex flex-wrap gap-3">
                      {tournament.status === "draft" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => changeStatus(tournament, "published")}
                          className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold hover:bg-violet-500 disabled:opacity-50"
                        >
                          {updating ? "Atualizando..." : "Publicar torneio"}
                        </button>
                      )}

                      {!["cancelled", "completed"].includes(
                        tournament.status,
                      ) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => changeStatus(tournament, "cancelled")}
                          className="rounded-xl border border-red-500/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {updating ? "Atualizando..." : "Cancelar torneio"}
                        </button>
                      )}
                    </div>
                  )}

                  {tournament.status === "published" && (
                    <p className="mt-5 text-xs text-zinc-500">
                      Torneio publicado. Inscrições ainda não disponíveis nesta
                      versão.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
