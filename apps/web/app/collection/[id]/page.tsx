import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

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
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50/40 to-white text-[#071a4c]">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-6">
          <Link href="/" aria-label="MastersTCG — início" className="shrink-0">
            <Image
              src="/masters-logo.png"
              alt="MastersTCG"
              width={1000}
              height={270}
              priority
              className="h-auto w-[190px] sm:w-[230px]"
            />
          </Link>

          <Link
            href="/collection"
            className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 transition hover:border-blue-500 hover:bg-blue-50"
          >
            ← Voltar para coleção
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-600">
            Minha coleção
          </p>

          <h1 className="mt-3 break-words text-4xl font-black tracking-tight text-[#071a4c] sm:text-5xl">
            {card.card_name || "Carta sem nome"}
          </h1>

          <p className="mt-3 text-slate-600">
            Consulte as imagens e informações cadastradas.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <section>
            <div className="grid gap-6 sm:grid-cols-2">
              <article>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black uppercase tracking-wider text-[#071a4c]">
                    Frente
                  </p>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                    Principal
                  </span>
                </div>

                <div className="flex aspect-[2.5/3.5] items-center justify-center overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-100 p-3 shadow-sm">
                  {frontImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={frontImageUrl}
                      alt={`Frente da carta ${card.card_name || ""}`}
                      className="h-full w-full rounded-2xl object-contain"
                    />
                  ) : (
                    <div className="px-6 text-center">
                      <p className="text-5xl text-blue-200">▣</p>
                      <p className="mt-4 text-sm font-semibold text-slate-500">
                        Esta carta não possui foto da frente.
                      </p>
                    </div>
                  )}
                </div>
              </article>

              <article>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black uppercase tracking-wider text-[#071a4c]">
                    Verso
                  </p>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                    Opcional
                  </span>
                </div>

                <div className="flex aspect-[2.5/3.5] items-center justify-center overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-100 p-3 shadow-sm">
                  {backImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={backImageUrl}
                      alt={`Verso da carta ${card.card_name || ""}`}
                      className="h-full w-full rounded-2xl object-contain"
                    />
                  ) : (
                    <div className="px-6 text-center">
                      <p className="text-5xl text-blue-200">▣</p>

                      <p className="mt-4 font-semibold text-slate-500">
                        Foto do verso não cadastrada.
                      </p>

                      <p className="mt-2 text-sm text-slate-400">
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
    <main className="flex min-h-screen items-center justify-center bg-blue-50 text-[#071a4c]">
      <p className="font-semibold text-slate-500">Carregando carta...</p>
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
