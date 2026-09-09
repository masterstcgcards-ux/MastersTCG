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
      front_image_path
      `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !card) {
    notFound();
  }

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

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-400">
            Minha coleção
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {card.card_name || "Carta sem nome"}
          </h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#13131d]">
            <div className="flex aspect-[2.5/3.5] items-center justify-center bg-gradient-to-br from-violet-950 to-zinc-950">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`Foto da carta ${card.card_name || ""}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="px-6 text-center text-zinc-500">
                  Esta carta não possui foto.
                </p>
              )}
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
