export function EnvVarWarning() {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-3">
      <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
        Configure as variáveis do Supabase
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled
          className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 opacity-50"
        >
          Entrar
        </button>

        <button
          type="button"
          disabled
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white opacity-50"
        >
          Criar conta
        </button>
      </div>
    </div>
  );
}
