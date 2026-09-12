import Image from "next/image";

export default function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/70 to-slate-50 px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="rounded-3xl border border-blue-100 bg-white px-10 py-8 text-center shadow-xl shadow-blue-950/5">
        <Image
          src="/masters-logo.png"
          alt="MastersTCG"
          width={260}
          height={70}
          priority
          className="mx-auto h-auto w-44"
        />

        <div
          className="mx-auto mt-7 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700"
          aria-hidden="true"
        />

        <p className="mt-5 font-semibold text-slate-600">
          Carregando MastersTCG...
        </p>
      </div>
    </main>
  );
}
