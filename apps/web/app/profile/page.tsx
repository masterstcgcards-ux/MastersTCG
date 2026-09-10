import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

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
      <main className="min-h-screen bg-[#09090f] px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">
            Não foi possível carregar o perfil
          </h1>

          <p className="mt-3 text-red-200">
            Atualize a página. Se o problema continuar, entre novamente na sua
            conta.
          </p>

          <Link
            href="/collection"
            className="mt-6 inline-block rounded-xl border border-white/20 px-5 py-3 font-bold text-white"
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

          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <Link href="/collection" className="hover:text-white">
              Minha coleção
            </Link>

            <span className="font-semibold text-white">Meu perfil</span>

            <Link href="/arena" className="hover:text-white">
              Arena
            </Link>
          </nav>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
            Área do Master
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Meu perfil
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-400">
            Personalize sua identidade de colecionador dentro do MastersTCG.
          </p>
        </div>

        <ProfileForm profile={profileData} />
      </section>
    </main>
  );
}

function ProfileLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p className="text-zinc-400">Carregando perfil...</p>
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
