import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

type ErrorPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function ErrorContent({
  searchParams,
}: {
  searchParams: ErrorPageProps["searchParams"];
}) {
  const params = await searchParams;

  if (!params.error) {
    return (
      <p className="leading-relaxed text-slate-600">
        Ocorreu um erro inesperado durante a autenticação. Tente entrar
        novamente.
      </p>
    );
  }

  return (
    <>
      <p className="leading-relaxed text-slate-600">
        Não foi possível concluir a autenticação. O link pode estar vencido ou
        já ter sido utilizado.
      </p>

      <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">
          Ver detalhes técnicos
        </summary>

        <p className="mt-3 break-words text-xs leading-relaxed text-slate-500">
          {params.error}
        </p>
      </details>
    </>
  );
}

function ErrorLoading() {
  return (
    <p role="status" className="leading-relaxed text-slate-500">
      Verificando o que aconteceu...
    </p>
  );
}

export default function Page({ searchParams }: ErrorPageProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-10 sm:px-6">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-950/5">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 px-6 py-9 text-center text-white sm:px-10">
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

        <section className="px-6 py-10 text-center sm:px-12 sm:py-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-red-100 bg-red-50 text-4xl font-black text-red-600">
            !
          </div>

          <span className="mt-7 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-700">
            Erro de autenticação
          </span>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-[#071a4c] sm:text-4xl">
            Não foi possível continuar
          </h1>

          <div className="mt-4">
            <Suspense fallback={<ErrorLoading />}>
              <ErrorContent searchParams={searchParams} />
            </Suspense>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-600"
            >
              Tentar entrar novamente
            </Link>

            <Link
              href="/"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-blue-200 bg-white px-6 py-3 font-bold text-blue-700 transition hover:bg-blue-50"
            >
              Voltar ao início
            </Link>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            Se o problema continuar, solicite um novo link de recuperação ou
            confirmação.
          </p>
        </section>
      </div>
    </main>
  );
}
