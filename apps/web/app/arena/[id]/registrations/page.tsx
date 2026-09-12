import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import {
  RegistrationReview,
  type TournamentRegistrationReview,
} from "@/components/registration-review";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

type RegistrationsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata = {
  title: "Inscrições do torneio | MastersTCG",
  description: "Revisão administrativa das inscrições do torneio.",
};

async function RegistrationsContent({ params }: RegistrationsPageProps) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: adminRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !adminRole) {
    redirect("/arena");
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select(
      `
        id,
        name,
        format,
        status,
        starts_at,
        max_players
      `,
    )
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError || !tournament) {
    notFound();
  }

  const { data: registrations, error: registrationsError } = await supabase.rpc(
    "get_tournament_registrations",
    {
      p_tournament_id: tournamentId,
    },
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 text-[#071a4c]">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-6">
          <Link href="/" aria-label="MastersTCG — início">
            <Image
              src="/masters-logo.png"
              alt="MastersTCG"
              width={260}
              height={70}
              priority
              className="h-auto w-44 sm:w-52"
            />
          </Link>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-slate-600">
            <Link href="/collection" className="transition hover:text-blue-700">
              Minha coleção
            </Link>

            <Link href="/decks" className="transition hover:text-blue-700">
              Meus decks
            </Link>

            <Link href="/arena" className="font-bold text-blue-700">
              Arena
            </Link>

            <Link href="/profile" className="transition hover:text-blue-700">
              Meu perfil
            </Link>
          </nav>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          href="/arena"
          className="inline-flex rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
        >
          ← Voltar para a Arena
        </Link>

        <div className="relative mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-9 text-white shadow-lg sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/25 blur-3xl"
          />

          <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
            <div>
              <span className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
                Administração da Arena
              </span>

              <h1 className="mt-5 text-3xl font-black sm:text-5xl">
                Inscrições
              </h1>

              <p className="mt-3 break-words text-xl font-bold text-white">
                {tournament.name}
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100">
                Revise os jogadores e as listas de cartas enviadas antes de
                confirmar a participação.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur-sm">
              <p className="text-sm text-blue-100">Capacidade do torneio</p>

              <p className="mt-1 text-2xl font-black text-yellow-300">
                {tournament.max_players} jogadores
              </p>
            </div>
          </div>
        </div>

        {tournament.status === "cancelled" && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            Este torneio foi cancelado. As inscrições permanecem disponíveis
            apenas para consulta do histórico.
          </div>
        )}

        {registrationsError ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
          >
            <p className="font-bold">
              Não foi possível carregar as inscrições.
            </p>
            <p className="mt-2 text-sm">{registrationsError.message}</p>
          </div>
        ) : (
          <div className="mt-8">
            <RegistrationReview
              initialRegistrations={
                (registrations ?? []) as TournamentRegistrationReview[]
              }
            />
          </div>
        )}
      </section>
    </main>
  );
}

function RegistrationsLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/70 to-slate-50">
      <div className="rounded-2xl border border-blue-100 bg-white px-8 py-6 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

        <p role="status" className="mt-4 font-semibold text-slate-600">
          Carregando inscrições...
        </p>
      </div>
    </main>
  );
}

export default function RegistrationsPage(props: RegistrationsPageProps) {
  return (
    <Suspense fallback={<RegistrationsLoading />}>
      <RegistrationsContent {...props} />
    </Suspense>
  );
}
