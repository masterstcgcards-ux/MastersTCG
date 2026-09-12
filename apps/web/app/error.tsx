"use client";

import Image from "next/image";
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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-10 sm:px-6">
      <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-blue-100 bg-white text-center shadow-xl shadow-blue-950/5">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-8">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl"
          />

          <Link
            href="/"
            aria-label="MastersTCG — início"
            className="relative inline-flex rounded-2xl bg-white px-5 py-3"
          >
            <Image
              src="/masters-logo.png"
              alt="MastersTCG"
              width={260}
              height={70}
              priority
              className="h-auto w-48"
            />
          </Link>
        </div>

        <div className="p-8 sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-red-100 bg-red-50 text-4xl font-black text-red-600">
            !
          </div>

          <p className="mt-7 text-sm font-bold uppercase tracking-[0.25em] text-red-600">
            Algo deu errado
          </p>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-[#071a4c] sm:text-4xl">
            Não foi possível carregar esta página
          </h1>

          <p className="mt-5 leading-relaxed text-slate-600">
            Tente novamente. Se o problema continuar, volte ao início e acesse a
            área desejada pelo menu.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-600"
            >
              Tentar novamente
            </button>

            <Link
              href="/"
              className="rounded-xl border border-blue-200 bg-white px-6 py-3 font-bold text-blue-700 transition hover:bg-blue-50"
            >
              Voltar ao início
            </Link>
          </div>

          {error.digest && (
            <p className="mt-7 break-words text-xs text-slate-400">
              Código de referência: {error.digest}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
