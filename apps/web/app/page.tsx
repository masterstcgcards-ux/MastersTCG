import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";

export const metadata = {
  title: "MastersTCG | Sua coleção. Sua arena.",
  description:
    "Organize sua coleção Pokémon, registre suas cartas e participe dos torneios da Arena Masters.",
};

const upcomingGames = [
  "Yu-Gi-Oh!",
  "Magic: The Gathering",
  "Disney Lorcana",
  "One Piece",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#071a4c]">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-6">
          <Link href="/" aria-label="MastersTCG — início" className="shrink-0">
            <Image
              src="/masters-logo.png"
              alt="MastersTCG"
              width={1000}
              height={270}
              priority
              className="h-auto w-[210px] sm:w-[260px]"
            />
          </Link>

          <nav
            aria-label="Navegação principal"
            className="order-3 flex w-full items-center justify-center gap-5 border-t border-blue-100 pt-4 text-sm font-semibold text-slate-600 sm:order-none sm:w-auto sm:border-0 sm:pt-0"
          >
            <Link href="/collection" className="transition hover:text-blue-600">
              Minha coleção
            </Link>

            <Link href="/arena" className="transition hover:text-blue-600">
              Arena
            </Link>

            <Link
              href="/marketplace"
              className="transition hover:text-blue-600"
            >
              Marketplace
            </Link>
          </nav>

          <div className="max-w-full overflow-x-auto">
            {hasEnvVars ? (
              <Suspense
                fallback={
                  <span role="status" className="text-sm text-slate-500">
                    Carregando conta...
                  </span>
                }
              >
                <AuthButton />
              </Suspense>
            ) : (
              <EnvVarWarning />
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-36 -top-36 h-[500px] w-[500px] rounded-full border-[80px] border-blue-100/60"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-blue-100/50 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
              <span className="text-lg leading-none">✦</span>
              Para quem vive o universo TCG
            </span>

            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-tight text-[#071a4c] sm:text-6xl lg:text-7xl">
              Sua coleção.
              <br />
              <span className="text-blue-600">Sua arena.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Cada carta tem uma história. Organize as suas no MastersTCG e
              prepare-se para competir nos torneios da Arena Masters.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/collection"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-blue-600 px-7 py-4 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Acessar minha coleção
                <span aria-hidden="true" className="ml-3 text-xl">
                  →
                </span>
              </Link>

              <Link
                href="/arena"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-blue-200 bg-white px-7 py-4 font-bold text-[#071a4c] transition hover:border-blue-500 hover:bg-blue-50"
              >
                Conhecer a Arena
              </Link>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Começando com Pokémon. Novos jogos em breve.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-2xl shadow-blue-950/10 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-blue-600">
                    Seu espaço de colecionador
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-[#071a4c]">
                    Tudo que um Master precisa.
                  </h2>
                </div>

                <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-black text-amber-600">
                  MASTER
                </span>
              </div>

              <div className="my-8 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8">
                <Image
                  src="/masters-logo.png"
                  alt=""
                  width={1000}
                  height={270}
                  className="mx-auto h-auto w-full max-w-[440px]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <span className="text-2xl font-black text-blue-600">01</span>
                  <p className="mt-2 text-sm font-bold text-[#071a4c]">
                    Coleção
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-4">
                  <span className="text-2xl font-black text-blue-600">02</span>
                  <p className="mt-2 text-sm font-bold text-[#071a4c]">
                    Marketplace
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-4">
                  <span className="text-2xl font-black text-amber-500">03</span>
                  <p className="mt-2 text-sm font-bold text-[#071a4c]">Arena</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
            Sua coleção começa aqui
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#071a4c] sm:text-4xl">
            Da sua mão para o seu perfil
          </h2>

          <p className="mt-4 leading-relaxed text-slate-600">
            Cadastre, organize e acompanhe suas cartas em um único lugar.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
              01
            </span>

            <h3 className="mt-5 text-xl font-black text-[#071a4c]">
              Envie a foto
            </h3>

            <p className="mt-3 leading-relaxed text-slate-600">
              Escolha uma foto nítida da frente da sua carta. Ela fica
              armazenada de forma privada.
            </p>
          </article>

          <article className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
              02
            </span>

            <h3 className="mt-5 text-xl font-black text-[#071a4c]">
              Preencha os detalhes
            </h3>

            <p className="mt-3 leading-relaxed text-slate-600">
              Informe nome, expansão, número, idioma e estado de conservação da
              sua carta.
            </p>
          </article>

          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-950/5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-lg font-black text-[#071a4c]">
              03
            </span>

            <h3 className="mt-5 text-xl font-black text-[#071a4c]">
              Veja sua coleção crescer
            </h3>

            <p className="mt-3 leading-relaxed text-slate-600">
              Consulte suas cartas, fotos e quantidades sempre que entrar na sua
              conta.
            </p>
          </article>
        </div>
      </section>

      <section
        id="arena"
        className="relative overflow-hidden bg-[#071a4c] text-white"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[60px] border-blue-500/20"
        />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full border border-amber-300/40 bg-amber-400/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-300">
              Disponível agora
            </span>

            <p className="mt-6 text-sm font-bold uppercase tracking-[0.25em] text-blue-300">
              Arena Masters
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              O próximo capítulo
              <br />
              <span className="text-amber-400">é competitivo.</span>
            </h2>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-blue-100/80">
              Participe de torneios, acompanhe seus confrontos e construa sua
              trajetória no ranking dos Masters.
            </p>

            <Link
              href="/arena"
              className="mt-8 inline-flex min-h-14 items-center justify-center rounded-2xl bg-amber-400 px-7 py-4 font-black text-[#071a4c] transition hover:bg-amber-300"
            >
              Entrar na Arena
              <span aria-hidden="true" className="ml-3 text-xl">
                →
              </span>
            </Link>
          </div>

          <div className="grid gap-4">
            <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h3 className="text-lg font-black text-white">
                Torneios com premiação
              </h3>
              <p className="mt-2 leading-relaxed text-blue-100/70">
                Consulte datas, formatos, regras e prêmios antes de participar.
              </p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h3 className="text-lg font-black text-white">
                Acompanhe sua participação
              </h3>
              <p className="mt-2 leading-relaxed text-blue-100/70">
                Rodadas, confrontos e resultados reunidos em um único espaço.
              </p>
            </article>

            <article className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-6">
              <h3 className="text-lg font-black text-amber-300">
                Construa sua trajetória
              </h3>
              <p className="mt-2 leading-relaxed text-blue-100/70">
                Registre sua evolução e conquiste posições no ranking.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        id="jogos"
        className="mx-auto max-w-7xl scroll-mt-8 px-5 py-16 sm:px-6 sm:py-20"
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
          Universo MastersTCG
        </p>

        <h2 className="mt-3 text-3xl font-black tracking-tight text-[#071a4c] sm:text-4xl">
          Começamos com Pokémon
        </h2>

        <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">
          O cadastro de cartas está disponível para Pokémon TCG. Outros jogos
          farão parte das próximas etapas.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            href="/collection"
            className="rounded-3xl border border-blue-500 bg-blue-600 p-6 text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-1 hover:bg-blue-700"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
              Coleção disponível
            </span>

            <h3 className="mt-5 text-xl font-black">Pokémon TCG</h3>

            <p className="mt-3 text-sm font-bold text-amber-300">
              Acessar coleção →
            </p>
          </Link>

          {upcomingGames.map((game) => (
            <article
              key={game}
              className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Em breve
              </span>

              <h3 className="mt-5 text-lg font-black text-[#071a4c]">{game}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 sm:pb-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-blue-100 bg-gradient-to-r from-blue-50 to-amber-50 p-8 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-blue-600">Comece agora</p>

            <h2 className="mt-2 text-2xl font-black text-[#071a4c] sm:text-3xl">
              Sua primeira carta já pode entrar.
            </h2>

            <p className="mt-3 text-slate-600">
              Acesse sua conta e comece a organizar sua coleção.
            </p>
          </div>

          <Link
            href="/collection"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-blue-600 px-7 py-4 font-black text-white transition hover:bg-blue-700"
          >
            Ir para minha coleção
          </Link>
        </div>
      </section>

      <footer className="border-t border-blue-100 bg-blue-50/50">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:px-6">
          <Image
            src="/masters-logo.png"
            alt="MastersTCG"
            width={1000}
            height={270}
            className="h-auto w-[180px]"
          />

          <p>Sua coleção. Sua arena.</p>

          <div className="flex flex-wrap gap-5 font-semibold">
            <Link href="/collection" className="hover:text-blue-600">
              Minha coleção
            </Link>

            <Link href="/marketplace" className="hover:text-blue-600">
              Marketplace
            </Link>

            <Link href="/arena" className="hover:text-blue-600">
              Arena
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
