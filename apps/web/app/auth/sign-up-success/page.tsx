import Image from "next/image";
import Link from "next/link";

export default function Page() {
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
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-50 text-4xl font-black text-emerald-600">
            ✓
          </div>

          <span className="mt-7 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
            Cadastro realizado
          </span>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-[#071a4c] sm:text-4xl">
            Confirme seu e-mail
          </h1>

          <p className="mx-auto mt-4 max-w-md leading-relaxed text-slate-600">
            Sua conta foi criada com sucesso. Enviamos uma mensagem para o
            e-mail cadastrado.
          </p>

          <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-left">
            <p className="font-bold text-blue-900">Próximo passo</p>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Abra a mensagem enviada pelo MastersTCG e clique no botão de
              confirmação. Depois disso, sua conta estará pronta para acessar.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-600"
            >
              Ir para o login
            </Link>

            <Link
              href="/"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-blue-200 bg-white px-6 py-3 font-bold text-blue-700 transition hover:bg-blue-50"
            >
              Voltar ao início
            </Link>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            Não encontrou a mensagem? Confira também as pastas de spam, lixo
            eletrônico ou promoções.
          </p>
        </section>
      </div>
    </main>
  );
}
