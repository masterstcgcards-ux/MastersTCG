import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CollectionBrowser } from "@/components/collection-browser";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Minha coleção | MastersTCG",
};

async function CollectionContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const userId = user.id;

  const { data: cards, error } = await supabase
    .from("user_cards")
    .select(
      `
      id,
      card_name,
      set_name,
      card_number,
      card_condition,
      language,
      quantity,
      front_image_path,
      created_at
      `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const cardsWithImages = await Promise.all(
    (cards ?? []).map(async (card) => {
      let imageUrl: string | null = null;

      if (
        card.front_image_path &&
        card.front_image_path.startsWith(`${userId}/`)
      ) {
        const { data: signedImage } = await supabase.storage
          .from("card-scans")
          .createSignedUrl(card.front_image_path, 3600);

        imageUrl = signedImage?.signedUrl ?? null;
      }

      return {
        ...card,
        imageUrl,
      };
    }),
  );

  const totalCards = cardsWithImages.reduce(
    (total, card) => total + (card.quantity ?? 0),
    0,
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-white text-[#071a4c]">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link href="/" aria-label="MastersTCG — início" className="shrink-0">
            <Image
              src="/masters-logo.png"
              alt="MastersTCG"
              width={1000}
              height={270}
              priority
              className="h-auto w-[190px] sm:w-[240px]"
            />
          </Link>

          <nav
            aria-label="Navegação principal"
            className="order-3 flex w-full gap-5 overflow-x-auto border-t border-blue-100 pt-4 text-sm font-semibold text-slate-500 md:order-none md:w-auto md:border-0 md:pt-0"
          >
            <span className="shrink-0 text-blue-600">Minha coleção</span>

            <Link
              href="/decks"
              className="shrink-0 transition hover:text-blue-600"
            >
              Meus decks
            </Link>

            <Link
              href="/marketplace"
              className="shrink-0 transition hover:text-blue-600"
            >
              Marketplace
            </Link>

            <Link
              href="/arena"
              className="shrink-0 transition hover:text-blue-600"
            >
              Arena
            </Link>

            <Link
              href="/ranking"
              className="shrink-0 transition hover:text-blue-600"
            >
              Ranking
            </Link>

            <Link
              href="/profile"
              className="shrink-0 transition hover:text-blue-600"
            >
              Meu perfil
            </Link>
          </nav>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-blue-600 hover:text-blue-700"
          >
            <span aria-hidden="true">←</span>
            Sua coleção
          </Link>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-[#071a4c] sm:text-5xl">
            Minha coleção
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-slate-600">
            Suas cartas, suas histórias.
          </p>
        </div>

        {!error && cardsWithImages.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                  ▣
                </span>

                <div>
                  <p className="text-3xl font-black text-blue-600">
                    {totalCards}
                  </p>
                  <p className="text-sm font-semibold text-[#071a4c]">
                    {totalCards === 1 ? "carta" : "cartas"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-500">
                  ★
                </span>

                <div>
                  <p className="text-3xl font-black text-blue-600">
                    {cardsWithImages.length}
                  </p>
                  <p className="text-sm font-semibold text-[#071a4c]">
                    {cardsWithImages.length === 1 ? "única" : "únicas"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Button
          asChild
          className="mb-8 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
        >
          <Link href="/collection/scan">
            <span aria-hidden="true" className="mr-3 text-2xl font-light">
              +
            </span>
            Adicionar carta
          </Link>
        </Button>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"
          >
            Não foi possível carregar sua coleção.
          </div>
        )}

        {!error && cardsWithImages.length === 0 && (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-white p-8 text-center shadow-sm">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-4xl text-blue-600">
              ◈
            </div>

            <h2 className="text-2xl font-black text-[#071a4c]">
              Sua coleção começa aqui
            </h2>

            <p className="mt-3 max-w-md leading-relaxed text-slate-600">
              Envie a foto da sua primeira carta Pokémon e preencha os dados
              para adicioná-la à sua coleção.
            </p>

            <Button
              asChild
              className="mt-7 min-h-12 rounded-xl bg-blue-600 px-6 font-bold text-white hover:bg-blue-700"
            >
              <Link href="/collection/scan">Adicionar primeira carta</Link>
            </Button>
          </div>
        )}

        {!error && cardsWithImages.length > 0 && (
          <CollectionBrowser cards={cardsWithImages} />
        )}
      </section>
    </main>
  );
}

function CollectionLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-50 text-[#071a4c]">
      <p className="font-semibold text-slate-500">Carregando coleção...</p>
    </main>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<CollectionLoading />}>
      <CollectionContent />
    </Suspense>
  );
}
