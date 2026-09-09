import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { CardManager } from "@/components/card-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Detalhes da carta | MastersTCG",
};

type CardPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function CardContent({ params }: CardPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const userId = user.id;

  const { data: card, error } = await supabase
    .from("user_cards")
    .select(
      `
      id,
      card_name,
      set_name,
      card_number,
      quantity,
      card_condition,
      language,
      finish,
      notes,
      front_image_path,
      back_image_path
      `,
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !card) {
    notFound();
  }

  async function createPrivateImageUrl(imagePath: string | null) {
    if (!imagePath || !imagePath.startsWith(`${userId}/`)) {
      return null;
    }

    const { data } = await supabase.storage
      .from("card-scans")
      .createSignedUrl(imagePath, 3600);

    return data?.signedUrl ?? null;
  }

  const [frontImageUrl, backImageUrl] = await Promise.all([
    createPrivateImageUrl(card.front_image_path),
    createPrivateImageUrl(card.back_image_path),
  ]);

  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-5">
          <Link
            href="/"
            aria-label="MastersTCG — início"
            className="text-2xl font-black tracking-tight"
          >
            MASTERS<span className="text-violet-400">TCG</span>
          </Link>

          <Link
            href="/collection"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-violet-400 hover:text-white"
          >
            ← Voltar para coleção
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-400">
            Minha coleção
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {card.card_name || "Carta sem nome"}
          </h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <section>
            <div className="grid gap-6 sm:grid-cols-2">
              <article>
                <p className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Frente
                </p>

                <div className="flex aspect-[2.5/3.5] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950 to-zinc-950">
                  {frontImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={frontImageUrl}
                      alt={`Frente da carta ${card.card_name || ""}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <p className="px-6 text-center text-zinc-500">
                      Esta carta não possui foto da frente.
                    </p>
                  )}
                </div>
              </article>

              <article>
                <p className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Verso
                </p>

                <div className="flex aspect-[2.5/3.5] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-violet-950">
                  {backImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={backImageUrl}
                      alt={`Verso da carta ${card.card_name || ""}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="px-6 text-center">
                      <p className="text-zinc-400">
                        Foto do verso não cadastrada.
                      </p>

                      <p className="mt-2 text-sm text-zinc-600">
                        As cartas cadastradas anteriormente continuam
                        funcionando normalmente.
                      </p>
                    </div>
                  )}
                </div>
              </article>
            </div>
          </section>

          <CardManager card={card} />
        </div>
      </section>
    </main>
  );
}

function CardLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] text-white">
      <p className="text-zinc-400">Carregando carta...</p>
    </main>
  );
}

export default function CardPage(props: CardPageProps) {
  return (
    <Suspense fallback={<CardLoading />}>
      <CardContent {...props} />
    </Suspense>
  );
}
