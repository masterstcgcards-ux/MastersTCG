"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-[#13131d] p-8 text-center shadow-2xl sm:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-400">
          Algo deu errado
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight">
          Não foi possível carregar esta página
        </h1>

        <p className="mt-5 leading-relaxed text-zinc-400">
          Tente novamente. Se o problema continuar, volte ao início e acesse a
          área desejada pelo menu.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-violet-600 px-6 py-3 font-bold transition hover:bg-violet-500"
          >
            Tentar novamente
          </button>

          <Link
            href="/"
            className="rounded-xl border border-white/15 px-6 py-3 font-bold transition hover:bg-white/5"
          >
            Voltar ao início
          </Link>
        </div>
      </section>
    </main>
  );
}
