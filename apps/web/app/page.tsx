import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";

export const metadata = {
  title: "MastersTCG | Sua coleção. Sua arena.",
  description:
    "Organize sua coleção Pokémon, registre suas cartas com fotos e prepare-se para os torneios da Arena Masters.",
};

const upcomingGames = [
  "Yu-Gi-Oh!",
  "Magic: The Gathering",
  "Disney Lorcana",
  "One Piece",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-5">
          <Link
            href="/"
            aria-label="MastersTCG — início"
            className="text-2xl font-black tracking-tight"
          >
            MASTERS<span className="text-violet-400">TCG</span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="flex items-center gap-5 text-sm text-zinc-300"
          >
            <Link
              href="/collection"
              className="transition hover:text-violet-300"
            >
              Minha coleção
            </Link>

            <Link href="#arena" className="transition hover:text-violet-300">
              Arena
            </Link>

            <Link href="#jogos" className="transition hover:text-violet-300">
              Jogos
            </Link>
          </nav>

          <div className="max-w-full overflow-x-auto">
            {hasEnvVars ? (
              <Suspense
                fallback={
                  <span role="status" className="text-sm text-zinc-400">
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

      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-violet-700/15 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-violet-300">
              Para quem vive o universo TCG
            </span>

            <h1 className="mt-7 text-5xl font-black leading-tight tracking-tight sm:text-6xl">
              Sua coleção.
              <br />
              <span className="text-violet-400">Sua arena.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
              Cada carta tem uma história. Organize as suas no MastersTCG e
              prepare-se para competir nos torneios da Arena Masters.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/collection"
                className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-4 font-bold text-white transition hover:bg-violet-500"
              >
                Acessar minha coleção
              </Link>

              <Link
                href="#arena"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-4 font-semibold transition hover:border-violet-400 hover:bg-white/5"
              >
                Conhecer a Arena
              </Link>
            </div>

            <p className="mt-5 text-sm text-zinc-500">
              Começando com Pokémon. Novos jogos em breve.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#11111b] p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-zinc-300">
                Seu espaço de colecionador
              </p>

              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                MASTER
              </span>
            </div>

            <div
              aria-hidden="true"
              className="relative mx-auto my-10 flex h-64 max-w-xs items-center justify-center"
            >
              <div className="absolute h-56 w-40 -translate-x-12 -rotate-12 rounded-2xl border border-violet-400/20 bg-[#202035]" />
              <div className="absolute h-56 w-40 translate-x-12 rotate-12 rounded-2xl border border-violet-400/20 bg-[#25203d]" />

              <div className="relative flex h-60 w-44 flex-col items-center justify-center rounded-2xl border border-violet-400/50 bg-gradient-to-br from-violet-600 to-[#151020] shadow-2xl">
                <span className="text-6xl font-black text-white">M</span>
                <span className="mt-4 text-xs font-bold tracking-[0.3em] text-violet-200">
                  MASTERS
                </span>
                <span className="mt-1 text-xs tracking-[0.5em] text-violet-300">
                  TCG
                </span>
              </div>
            </div>

            <h2 className="text-xl font-bold">Suas cartas, organizadas.</h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Guarde fotos, registre os detalhes e acompanhe sua coleção em um
              só lugar.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center text-xs text-zinc-300">
              <span>Fotos privadas</span>
              <span>Dados da carta</span>
              <span>Quantidade</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
            Sua coleção começa aqui
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Da sua mão para o seu perfil
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-[#11111b] p-6">
            <p className="text-sm font-bold text-violet-400">01</p>
            <h3 className="mt-4 text-xl font-bold">Envie a foto</h3>
            <p className="mt-3 leading-relaxed text-zinc-400">
              Escolha uma foto nítida da frente da sua carta. Ela fica
              armazenada de forma privada.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#11111b] p-6">
            <p className="text-sm font-bold text-violet-400">02</p>
            <h3 className="mt-4 text-xl font-bold">Preencha os detalhes</h3>
            <p className="mt-3 leading-relaxed text-zinc-400">
              Informe nome, expansão, número, idioma e estado de conservação. O
              cadastro é manual nesta versão.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#11111b] p-6">
            <p className="text-sm font-bold text-violet-400">03</p>
            <h3 className="mt-4 text-xl font-bold">Veja sua coleção crescer</h3>
            <p className="mt-3 leading-relaxed text-zinc-400">
              Consulte suas cartas com fotos e quantidades sempre que entrar na
              sua conta.
            </p>
          </article>
        </div>
      </section>

      <section
        id="arena"
        className="scroll-mt-8 border-y border-white/10 bg-[#101019]"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-300">
              Disponível agora
            </span>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
              Arena Masters
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight">
              O próximo capítulo
              <br />é competitivo.
            </h2>

            <p className="mt-5 max-w-xl leading-relaxed text-zinc-400">
              A Arena é o espaço dos torneios MastersTCG: competições com
              regulamento, inscrições, acompanhamento de partidas e prêmios
              definidos em cada evento.
            </p>

            <Link
              href="/arena"
              className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-500"
            >
              Explorar a Arena
            </Link>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <article className="rounded-2xl border border-white/10 bg-[#161620] p-5">
              <h3 className="font-bold">Torneios com premiação</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Datas, formato, regras e prêmios apresentados antes de cada
                competição.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#161620] p-5">
              <h3 className="font-bold">Acompanhe sua participação</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Rodadas, confrontos e resultados reunidos na Arena.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#161620] p-5">
              <h3 className="font-bold">Construa sua trajetória Master</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Um espaço para registrar sua evolução nos torneios.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="jogos" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
          Universo MastersTCG
        </p>

        <h2 className="mt-3 text-3xl font-bold tracking-tight">
          Começamos com Pokémon
        </h2>

        <p className="mt-4 max-w-2xl text-zinc-400">
          O cadastro de cartas está disponível para Pokémon TCG. Outros jogos
          farão parte das próximas etapas.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            href="/collection"
            className="rounded-2xl border border-violet-400/40 bg-violet-500/10 p-5 transition hover:bg-violet-500/20"
          >
            <span className="text-xs font-semibold text-violet-300">
              Coleção disponível
            </span>
            <h3 className="mt-4 text-lg font-bold">Pokémon TCG</h3>
            <p className="mt-3 text-sm text-violet-200">Acessar coleção →</p>
          </Link>

          {upcomingGames.map((game) => (
            <article
              key={game}
              className="rounded-2xl border border-white/10 bg-[#11111b] p-5"
            >
              <span className="text-xs text-zinc-500">Em breve</span>
              <h3 className="mt-4 text-lg font-bold text-zinc-300">{game}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">
              Sua primeira carta já pode entrar.
            </h2>
            <p className="mt-3 text-zinc-400">
              Acesse sua conta e comece a organizar sua coleção.
            </p>
          </div>

          <Link
            href="/collection"
            className="shrink-0 rounded-xl bg-violet-600 px-6 py-4 font-bold transition hover:bg-violet-500"
          >
            Ir para minha coleção
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-6 py-8 text-sm text-zinc-500 sm:flex-row">
          <p className="font-bold text-zinc-300">MASTERS TCG</p>
          <p>Sua coleção. Sua arena.</p>
          <Link href="/collection" className="hover:text-violet-300">
            Minha coleção
          </Link>
        </div>
      </footer>
    </main>
  );
}
