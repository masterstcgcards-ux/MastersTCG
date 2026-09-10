export default function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#09090f] px-6 text-white"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="text-center">
        <div
          className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-violet-500"
          aria-hidden="true"
        />

        <p className="mt-5 font-semibold text-zinc-300">
          Carregando MastersTCG...
        </p>
      </div>
    </main>
  );
}
