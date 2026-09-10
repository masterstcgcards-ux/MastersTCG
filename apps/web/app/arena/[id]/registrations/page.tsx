import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

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
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight">
            MASTERS<span className="text-violet-400">TCG</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm text-zinc-400">
            <Link href="/collection" className="hover:text-white">
              Minha coleção
            </Link>

            <Link href="/decks" className="hover:text-white">
              Meus decks
            </Link>

            <Link href="/arena" className="font-semibold text-white">
              Arena
            </Link>

            <Link href="/profile" className="hover:text-white">
              Meu perfil
            </Link>
          </nav>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/arena" className="text-sm text-zinc-400 hover:text-white">
          ← Voltar para a Arena
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
              Administração da Arena
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Inscrições</h1>

            <p className="mt-3 break-words text-xl font-bold text-zinc-200">
              {tournament.name}
            </p>

            <p className="mt-2 text-sm text-zinc-400">
              Revise os jogadores e as listas de cartas enviadas antes de
              confirmar a participação.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11111b] px-6 py-4">
            <p className="text-sm text-zinc-400">Capacidade do torneio</p>

            <p className="mt-1 text-2xl font-black">
              {tournament.max_players} jogadores
            </p>
          </div>
        </div>

        {tournament.status === "cancelled" && (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            Este torneio foi cancelado. As inscrições permanecem disponíveis
            apenas para consulta do histórico.
          </div>
        )}

        {registrationsError ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200"
          >
            Não foi possível carregar as inscrições:{" "}
            {registrationsError.message}
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
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p role="status" className="text-zinc-400">
        Carregando inscrições...
      </p>
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
