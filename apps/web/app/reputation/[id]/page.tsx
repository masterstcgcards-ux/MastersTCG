import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import {
  ReputationCard,
  type ReputationSummary,
  type UserReview,
} from "@/components/reputation-card";
import { ReportForm } from "@/components/report-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Reputação | MastersTCG",
  description: "Confira a reputação de um colecionador.",
};

export const instant = false;

type ReputationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PublicProfile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type RawReputation = Omit<
  ReputationSummary,
  | "average_rating"
  | "total_reviews"
  | "five_star_reviews"
  | "four_star_reviews"
  | "three_star_reviews"
  | "two_star_reviews"
  | "one_star_reviews"
> & {
  average_rating: number | string;
  total_reviews: number | string;
  five_star_reviews: number | string;
  four_star_reviews: number | string;
  three_star_reviews: number | string;
  two_star_reviews: number | string;
  one_star_reviews: number | string;
};

async function ReputationContent({ params }: ReputationPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: profileData, error: profileError } = await supabase.rpc(
    "get_public_collector_profile",
    {
      p_user_id: id,
    },
  );

  if (profileError) {
    return (
      <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-violet-300"
          >
            ← Voltar ao Marketplace
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Não foi possível carregar o perfil: {profileError.message}
          </div>
        </div>
      </main>
    );
  }

  const profile = (profileData || [])[0] as PublicProfile | undefined;

  if (!profile) {
    notFound();
  }

  const { data: reputationData, error: reputationError } = await supabase.rpc(
    "get_user_reputation",
    {
      p_user_id: id,
    },
  );

  const { data: reviewsData, error: reviewsError } = await supabase.rpc(
    "get_user_reviews",
    {
      p_user_id: id,
    },
  );

  const loadingError = reputationError || reviewsError;

  if (loadingError) {
    return (
      <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-violet-300"
          >
            ← Voltar ao Marketplace
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Não foi possível carregar a reputação: {loadingError.message}
          </div>
        </div>
      </main>
    );
  }

  const rawSummary = (reputationData || [])[0] as RawReputation | undefined;

  const summary: ReputationSummary = rawSummary
    ? {
        user_id: rawSummary.user_id,
        average_rating: Number(rawSummary.average_rating),
        total_reviews: Number(rawSummary.total_reviews),
        five_star_reviews: Number(rawSummary.five_star_reviews),
        four_star_reviews: Number(rawSummary.four_star_reviews),
        three_star_reviews: Number(rawSummary.three_star_reviews),
        two_star_reviews: Number(rawSummary.two_star_reviews),
        one_star_reviews: Number(rawSummary.one_star_reviews),
      }
    : {
        user_id: id,
        average_rating: 0,
        total_reviews: 0,
        five_star_reviews: 0,
        four_star_reviews: 0,
        three_star_reviews: 0,
        two_star_reviews: 0,
        one_star_reviews: 0,
      };

  const reviews = (reviewsData || []) as UserReview[];

  const userName = profile.display_name || profile.username || "Master";

  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-4">
          <Link
            href="/"
            aria-label="MastersTCG — início"
            className="text-xl font-black tracking-tight"
          >
            MASTERS<span className="text-violet-400">TCG</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm text-zinc-400">
            <Link href="/collection" className="hover:text-white">
              Minha coleção
            </Link>
            <Link href="/marketplace" className="hover:text-white">
              Marketplace
            </Link>
            <Link href="/orders" className="hover:text-white">
              Pedidos
            </Link>
            <Link href="/auctions" className="hover:text-white">
              Leilões
            </Link>
            <Link href="/arena" className="hover:text-white">
              Arena
            </Link>
            <Link href="/profile" className="hover:text-white">
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <Link
          href="/marketplace"
          className="text-sm font-semibold text-violet-300 hover:text-violet-200"
        >
          ← Voltar ao Marketplace
        </Link>

        <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#13131d] p-6 sm:flex-row sm:items-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={userName}
              className="h-24 w-24 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-violet-600 text-3xl font-black">
              {userName.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
              Perfil do colecionador
            </p>

            <h1 className="mt-2 break-words text-3xl font-black">{userName}</h1>

            {profile.username && (
              <p className="mt-1 text-zinc-500">@{profile.username}</p>
            )}

            {profile.bio && (
              <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm text-zinc-300">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {user.id !== id && (
          <div className="mb-8">
            <ReportForm targetType="user" targetId={id} targetLabel="usuário" />
          </div>
        )}

        <ReputationCard
          userName={userName}
          summary={summary}
          reviews={reviews}
        />
      </section>
    </main>
  );
}

function LoadingReputation() {
  return (
    <main className="min-h-screen bg-[#09090f] px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
        <div className="mt-8 h-96 animate-pulse rounded-2xl bg-white/5" />
      </div>
    </main>
  );
}

export default function ReputationPage(props: ReputationPageProps) {
  return (
    <Suspense fallback={<LoadingReputation />}>
      <ReputationContent {...props} />
    </Suspense>
  );
}
