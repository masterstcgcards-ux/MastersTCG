"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { TournamentRegistration } from "@/components/tournament-registration";
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
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  published: "border-blue-200 bg-blue-50 text-blue-700",
  in_progress: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
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

const fieldClass =
  "mt-2 block w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const labelClass = "text-sm font-bold text-[#071a4c]";

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
          ? "Torneio publicado com sucesso."
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

  return (
    <div className="space-y-8">
      {isAdmin && (
        <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white p-6 sm:p-8">
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
              Administração
            </span>

            <h2 className="mt-4 text-2xl font-black text-[#071a4c]">
              Criar torneio
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Todo novo torneio começa como rascunho e fica visível apenas para
              administradores até sua publicação.
            </p>
          </div>

          <form onSubmit={handleCreate} className="p-5 sm:p-8">
            <fieldset
              disabled={busy}
              className="grid min-w-0 gap-5 disabled:opacity-60 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <label htmlFor="tournament-name" className={labelClass}>
                  Nome do torneio *
                </label>

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
                <label htmlFor="tournament-format" className={labelClass}>
                  Formato *
                </label>

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
                <label htmlFor="tournament-capacity" className={labelClass}>
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
                <label htmlFor="tournament-start" className={labelClass}>
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
                <label htmlFor="tournament-deadline" className={labelClass}>
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
                <label htmlFor="tournament-location" className={labelClass}>
                  Local ou modalidade
                </label>

                <input
                  id="tournament-location"
                  name="location"
                  maxLength={300}
                  placeholder="Ex.: São Caetano do Sul — local a confirmar"
                  className={fieldClass}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="tournament-description" className={labelClass}>
                  Descrição
                </label>

                <textarea
                  id="tournament-description"
                  name="description"
                  rows={3}
                  maxLength={5000}
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="tournament-rules" className={labelClass}>
                  Regulamento
                </label>

                <textarea
                  id="tournament-rules"
                  name="rules"
                  rows={4}
                  maxLength={10000}
                  placeholder="Informe as condições de participação."
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="tournament-prizes" className={labelClass}>
                  Premiação
                </label>

                <textarea
                  id="tournament-prizes"
                  name="prizes_description"
                  rows={2}
                  maxLength={3000}
                  placeholder="Descreva somente prêmios confirmados."
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-6 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
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
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      <section>
        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">
            Competições
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#071a4c]">
            {isAdmin ? "Gerenciar torneios" : "Torneios"}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Confira os torneios publicados e envie seu deck para revisão.
          </p>
        </div>

        {tournaments.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600">
              ◇
            </div>

            <h3 className="mt-5 text-xl font-black text-[#071a4c]">
              Nenhum torneio encontrado
            </h3>

            <p className="mt-2 text-slate-600">
              {isAdmin
                ? "Nenhum torneio cadastrado. Crie o primeiro rascunho acima."
                : "Nenhum torneio publicado no momento."}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {tournaments.map((tournament) => {
              const updating = updatingId === tournament.id;

              return (
                <article
                  key={tournament.id}
                  className="min-w-0 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 p-6 text-white">
                    <div
                      aria-hidden="true"
                      className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-yellow-400/20 blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-yellow-300">
                          Pokémon TCG
                        </p>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            statusStyles[tournament.status] ||
                            statusStyles.draft
                          }`}
                        >
                          {statusLabels[tournament.status] || tournament.status}
                        </span>
                      </div>

                      <h3 className="mt-4 break-words text-2xl font-black">
                        {tournament.name}
                      </h3>

                      {tournament.description && (
                        <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-blue-100">
                          {tournament.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-xs font-semibold text-slate-500">
                          Formato
                        </dt>
                        <dd className="mt-1 font-bold text-[#071a4c]">
                          {formatLabels[tournament.format] || tournament.format}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-xs font-semibold text-slate-500">
                          Capacidade
                        </dt>
                        <dd className="mt-1 font-bold text-[#071a4c]">
                          Até {tournament.max_players}
                        </dd>
                      </div>

                      <div className="col-span-2 rounded-xl bg-blue-50 p-3">
                        <dt className="text-xs font-semibold text-blue-600">
                          Início — Brasília
                        </dt>
                        <dd className="mt-1 font-bold text-blue-800">
                          {formatDate(tournament.starts_at)}
                        </dd>
                      </div>

                      {tournament.registration_deadline && (
                        <div className="col-span-2 rounded-xl bg-amber-50 p-3">
                          <dt className="text-xs font-semibold text-amber-700">
                            Prazo de inscrição — Brasília
                          </dt>
                          <dd className="mt-1 font-bold text-amber-900">
                            {formatDate(tournament.registration_deadline)}
                          </dd>
                        </div>
                      )}

                      <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                        <dt className="text-xs font-semibold text-slate-500">
                          Local
                        </dt>
                        <dd className="mt-1 break-words font-bold text-[#071a4c]">
                          {tournament.location || "A confirmar"}
                        </dd>
                      </div>
                    </dl>

                    {tournament.prizes_description && (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <h4 className="font-black text-amber-800">Premiação</h4>

                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-950">
                          {tournament.prizes_description}
                        </p>
                      </div>
                    )}

                    {tournament.rules && (
                      <details className="mt-5 overflow-hidden rounded-2xl border border-blue-100">
                        <summary className="cursor-pointer bg-blue-50 px-4 py-3 font-bold text-blue-700">
                          Ver regulamento
                        </summary>

                        <p className="whitespace-pre-wrap break-words border-t border-blue-100 p-4 text-sm leading-relaxed text-slate-600">
                          {tournament.rules}
                        </p>
                      </details>
                    )}

                    {tournament.status !== "draft" && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/arena/${tournament.id}/bracket`}
                          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                          Ver chave
                        </Link>

                        {isAdmin && (
                          <Link
                            href={`/arena/${tournament.id}/registrations`}
                            className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                          >
                            Ver inscrições
                          </Link>
                        )}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="mt-6 flex flex-wrap gap-3 border-t border-blue-100 pt-5">
                        {tournament.status === "draft" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              changeStatus(tournament, "published")
                            }
                            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                            onClick={() =>
                              changeStatus(tournament, "cancelled")
                            }
                            className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updating ? "Atualizando..." : "Cancelar torneio"}
                          </button>
                        )}
                      </div>
                    )}

                    {tournament.status === "published" && (
                      <TournamentRegistration
                        tournamentId={tournament.id}
                        tournamentFormat={tournament.format}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
