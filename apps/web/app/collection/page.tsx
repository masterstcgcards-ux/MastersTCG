import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
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
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const cardsWithImages = await Promise.all(
    (cards ?? []).map(async (card) => {
      let imageUrl: string | null = null;

      if (
        card.front_image_path &&
        card.front_image_path.startsWith(`${user.id}/`)
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
            <span className="font-semibold text-white">Minha coleção</span>
            <span>Marketplace · Em breve</span>
            <span>Arena · Em breve</span>

            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
              Pokémon
            </span>
          </nav>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
              Área do Master
            </p>

            <h1 className="text-4xl font-black tracking-tight">
              Minha coleção
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Cadastre, organize e acompanhe todas as cartas da sua coleção.
            </p>

            {!error && cardsWithImages.length > 0 && (
              <p className="mt-4 text-sm font-semibold text-violet-300">
                {totalCards}{" "}
                {totalCards === 1 ? "carta cadastrada" : "cartas cadastradas"}
              </p>
            )}
          </div>

          <Button
            asChild
            className="bg-violet-600 font-bold text-white hover:bg-violet-500"
          >
            <Link href="/collection/scan">Adicionar carta</Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            Não foi possível carregar sua coleção.
          </div>
        )}

        {!error && cardsWithImages.length === 0 && (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-500/10 text-4xl">
              ◈
            </div>

            <h2 className="text-2xl font-bold">Sua coleção começa aqui</h2>

            <p className="mt-3 max-w-md text-zinc-400">
              Envie uma foto da sua primeira carta Pokémon e preencha os dados
              para adicioná-la à sua coleção.
            </p>

            <Button
              asChild
              className="mt-7 bg-violet-600 font-bold text-white hover:bg-violet-500"
            >
              <Link href="/collection/scan">Adicionar primeira carta</Link>
            </Button>
          </div>
        )}

        {!error && cardsWithImages.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cardsWithImages.map((card) => (
              <Link
                key={card.id}
                href={`/collection/${card.id}`}
                className="group block"
              >
                <article className="h-full overflow-hidden rounded-2xl border border-white/10 bg-[#13131d] transition duration-200 group-hover:-translate-y-1 group-hover:border-violet-500/60 group-hover:shadow-xl group-hover:shadow-violet-950/30">
                  <div className="flex aspect-[2.5/3.5] items-center justify-center overflow-hidden bg-gradient-to-br from-violet-950 to-zinc-950">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={`Foto da carta ${card.card_name || ""}`}
                        className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <span className="text-zinc-500">Imagem da carta</span>
                    )}
                  </div>

                  <div className="p-5">
                    <h2 className="font-bold">
                      {card.card_name || "Carta sem nome"}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-400">
                      {card.set_name || "Coleção não informada"}
                      {card.card_number ? ` • ${card.card_number}` : ""}
                    </p>

                    <div className="mt-4 flex justify-between gap-3 text-xs text-zinc-500">
                      <span>
                        {card.card_condition || "Estado não informado"}
                      </span>

                      <span>
                        {card.quantity}{" "}
                        {card.quantity === 1 ? "unidade" : "unidades"}
                      </span>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-violet-400">
                      Ver detalhes →
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CollectionLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p className="text-zinc-400">Carregando coleção...</p>
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
