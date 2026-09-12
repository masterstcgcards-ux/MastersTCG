import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ReportForm } from "@/components/report-form";
import {
  ReputationCard,
  type ReputationSummary,
  type UserReview,
} from "@/components/reputation-card";
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

function ErrorState({ message, detail }: { message: string; detail: string }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 text-[#071a4c] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/marketplace"
          className="text-sm font-bold text-blue-700 hover:text-blue-800"
        >
          ← Voltar ao Marketplace
        </Link>

        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="font-bold">{message}</p>
          <p className="mt-2 text-sm">{detail}</p>
        </div>
      </div>
    </main>
  );
}

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
      <ErrorState
        message="Não foi possível carregar o perfil."
        detail={profileError.message}
      />
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
      <ErrorState
        message="Não foi possível carregar a reputação."
        detail={loadingError.message}
      />
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

            <Link
              href="/marketplace"
              className="transition hover:text-blue-700"
            >
              Marketplace
            </Link>

            <Link href="/orders" className="transition hover:text-blue-700">
              Pedidos
            </Link>

            <Link href="/auctions" className="transition hover:text-blue-700">
              Leilões
            </Link>

            <Link href="/arena" className="transition hover:text-blue-700">
              Arena
            </Link>

            <Link href="/profile" className="transition hover:text-blue-700">
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          href="/marketplace"
          className="inline-flex rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
        >
          ← Voltar ao Marketplace
        </Link>

        <div className="relative mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 p-6 text-white shadow-lg sm:p-10">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/25 blur-3xl"
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={userName}
                className="h-28 w-28 shrink-0 rounded-3xl border-4 border-white/20 object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border-4 border-white/20 bg-yellow-400 text-4xl font-black text-[#071a4c] shadow-lg">
                {userName.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
                Perfil do colecionador
              </p>

              <h1 className="mt-2 break-words text-3xl font-black sm:text-4xl">
                {userName}
              </h1>

              {profile.username && (
                <p className="mt-1 font-semibold text-blue-100">
                  @{profile.username}
                </p>
              )}

              {profile.bio && (
                <p className="mt-4 max-w-3xl whitespace-pre-wrap break-words text-sm leading-relaxed text-blue-50">
                  {profile.bio}
                </p>
              )}
            </div>
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
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="h-40 animate-pulse rounded-3xl bg-blue-100" />
        <div className="mt-8 h-96 animate-pulse rounded-3xl bg-white shadow-sm" />
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
