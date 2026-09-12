import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LogoutButton } from "@/components/logout-button";
import { ProfileForm } from "@/components/profile-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Meu perfil | MastersTCG",
};

async function ProfileContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const userId = user.id;

  const [
    { data: profile, error: profileError },
    { data: cards, error: cardsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, bio, created_at")
      .eq("id", userId)
      .maybeSingle(),

    supabase.from("user_cards").select("quantity").eq("user_id", userId),
  ]);

  if (profileError || cardsError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-20 text-[#071a4c] sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl font-black text-red-600">
            !
          </div>

          <h1 className="mt-5 text-2xl font-black">
            Não foi possível carregar o perfil
          </h1>

          <p className="mt-3 text-slate-600">
            Atualize a página. Se o problema continuar, entre novamente na sua
            conta.
          </p>

          <Link
            href="/collection"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            Voltar para coleção
          </Link>
        </div>
      </main>
    );
  }

  const totalCards = (cards ?? []).reduce(
    (total, card) => total + (card.quantity ?? 0),
    0,
  );

  const profileData = {
    id: userId,
    email: user.email || "",
    username: profile?.username ?? null,
    display_name:
      profile?.display_name ?? user.user_metadata?.display_name ?? null,
    bio: profile?.bio ?? null,
    created_at: profile?.created_at ?? user.created_at ?? null,
    totalCards,
  };

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

          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/collection" className="transition hover:text-blue-700">
              Minha coleção
            </Link>

            <span className="font-bold text-blue-700">Meu perfil</span>

            <Link href="/arena" className="transition hover:text-blue-700">
              Arena
            </Link>

            <Link
              href="/marketplace"
              className="transition hover:text-blue-700"
            >
              Marketplace
            </Link>
          </nav>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/25 blur-3xl"
          />

          <div className="relative">
            <span className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
              Área do Master
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
              Meu perfil
            </h1>

            <p className="mt-4 max-w-2xl leading-relaxed text-blue-100">
              Personalize sua identidade de colecionador dentro do MastersTCG.
            </p>

            <div className="mt-7 inline-flex rounded-2xl border border-white/20 bg-white/10 px-5 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                  Cartas na coleção
                </p>

                <p className="mt-1 text-2xl font-black text-yellow-300">
                  {totalCards}
                </p>
              </div>
            </div>
          </div>
        </div>

        <ProfileForm profile={profileData} />
      </section>
    </main>
  );
}

function ProfileLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/70 to-slate-50">
      <div className="rounded-2xl border border-blue-100 bg-white px-8 py-6 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

        <p className="mt-4 font-semibold text-slate-600">
          Carregando perfil...
        </p>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileContent />
    </Suspense>
  );
}
