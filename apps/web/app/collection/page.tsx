import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Minha coleção | MastersTCG",
};

const conditions: Record<string, string> = {
  mint: "Impecável",
  near_mint: "Quase impecável",
  excellent: "Excelente",
  good: "Bom",
  played: "Com desgaste",
  poor: "Muito danificada",
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
      quantity,
      front_image_path
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const collection = await Promise.all(
    (cards ?? []).map(async (card) => {
      let imageUrl: string | null = null;

      // Só solicita imagens da pasta deste usuário.
      if (card.front_image_path?.startsWith(`${user.id}/`)) {
        const { data, error: imageError } = await supabase.storage
          .from("card-scans")
          .createSignedUrl(card.front_image_path, 3600);

        if (!imageError && data) {
          imageUrl = data.signedUrl;
        }
      }

      return { ...card, imageUrl };
    }),
  );

  const total = collection.reduce((sum, card) => sum + card.quantity, 0);

  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-xl font-black tracking-tight">
            MASTERS<span className="text-violet-500">TCG</span>
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
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
              Área do Master
            </p>

            <h1 className="text-4xl font-black tracking-tight">
              Minha coleção
            </h1>

            <p className="mt-3 text-zinc-400">
              Cadastre, organize e acompanhe as cartas da sua coleção.
            </p>

            {!error && (
              <p className="mt-4 text-sm text-violet-300">
                {total} {total === 1 ? "carta" : "cartas"} · {collection.length}{" "}
                {collection.length === 1 ? "cadastro" : "cadastros"}
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
          <div
            role="alert"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200"
          >
            Não foi possível carregar sua coleção. Atualize a página para tentar
            novamente.
          </div>
        )}

        {!error && collection.length === 0 && (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
            <div
              aria-hidden="true"
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-500/10 text-4xl"
            >
              ◈
            </div>

            <h2 className="text-2xl font-bold">Sua coleção começa aqui</h2>

            <p className="mt-3 max-w-md text-zinc-400">
              Envie uma foto da sua primeira carta Pokémon e preencha os dados
              para adicioná-la à coleção.
            </p>

            <Button
              asChild
              className="mt-7 bg-violet-600 font-bold text-white hover:bg-violet-500"
            >
              <Link href="/collection/scan">Adicionar primeira carta</Link>
            </Button>
          </div>
        )}

        {!error && collection.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {collection.map((card) => (
              <article
                key={card.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#13131d]"
              >
                <div className="flex aspect-[2.5/3.5] items-center justify-center bg-[#0d0d16] p-3">
                  {card.imageUrl ? (
                    // URL temporária da foto privada.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.imageUrl}
                      alt={`Foto de ${card.card_name || "carta"}`}
                      loading="lazy"
                      className="h-full w-full rounded-lg object-contain"
                    />
                  ) : (
                    <p className="px-4 text-center text-sm text-zinc-500">
                      Foto indisponível. Tente atualizar a página.
                    </p>
                  )}
                </div>

                <div className="p-5">
                  <h2 className="text-lg font-bold">
                    {card.card_name || "Carta sem nome"}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-400">
                    {card.set_name || "Coleção não informada"}
                    {card.card_number ? ` • ${card.card_number}` : ""}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-violet-500/10 px-3 py-1 text-violet-300">
                      {conditions[card.card_condition] ||
                        "Estado não informado"}
                    </span>

                    <span className="text-zinc-400">
                      {card.quantity}{" "}
                      {card.quantity === 1 ? "unidade" : "unidades"}
                    </span>
                  </div>
                </div>
              </article>
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
      <p role="status" className="text-zinc-400">
        Carregando sua coleção...
      </p>
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
