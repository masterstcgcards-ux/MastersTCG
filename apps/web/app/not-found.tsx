import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#13131d] p-8 text-center shadow-2xl sm:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-violet-400">
          Erro 404
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Página não encontrada
        </h1>

        <p className="mt-5 leading-relaxed text-zinc-400">
          O endereço acessado não existe ou o conteúdo não está mais disponível.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-violet-600 px-6 py-3 font-bold transition hover:bg-violet-500"
        >
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
