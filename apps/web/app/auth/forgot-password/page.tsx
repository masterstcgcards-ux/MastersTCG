import Image from "next/image";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-b from-blue-50/70 to-slate-50 px-5 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-950/5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl"
          />

          <Link
            href="/"
            aria-label="MastersTCG — início"
            className="relative inline-flex w-fit rounded-2xl bg-white px-5 py-3"
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

          <div className="relative mt-20">
            <span className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
              Recuperação de acesso
            </span>

            <h1 className="mt-5 text-4xl font-black leading-tight">
              Vamos ajudar você a voltar para sua coleção.
            </h1>

            <p className="mt-4 max-w-md leading-relaxed text-blue-100">
              Informe seu e-mail e enviaremos as instruções necessárias para
              criar uma nova senha.
            </p>
          </div>

          <p className="relative mt-16 text-sm text-blue-200">
            MastersTCG — Sua coleção. Sua Arena.
          </p>
        </section>

        <section className="flex items-center p-6 sm:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-md">
            <Link
              href="/"
              aria-label="MastersTCG — início"
              className="mb-10 inline-flex lg:hidden"
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

            <ForgotPasswordForm />
          </div>
        </section>
      </div>
    </main>
  );
}
