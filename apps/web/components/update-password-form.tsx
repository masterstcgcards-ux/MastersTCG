"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setError(null);

    if (password.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== repeatPassword) {
      setError("As senhas informadas não são iguais.");
      return;
    }

    const supabase = createClient();

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      router.push("/protected");
      router.refresh();
    } catch (updateError: unknown) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar sua senha.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <div>
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
          Nova senha
        </span>

        <h2 className="mt-5 text-3xl font-black tracking-tight text-[#071a4c] sm:text-4xl">
          Atualize sua senha
        </h2>

        <p className="mt-3 leading-relaxed text-slate-600">
          Escolha uma nova senha para recuperar o acesso à sua conta MastersTCG.
        </p>
      </div>

      <form onSubmit={handleUpdatePassword} className="mt-8">
        <div className="flex flex-col gap-5">
          <div>
            <Label
              htmlFor="password"
              className="text-sm font-bold text-slate-700"
            >
              Nova senha
            </Label>

            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="Digite sua nova senha"
              required
              value={password}
              disabled={isLoading}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 rounded-xl border-blue-100 bg-white px-4 text-[#071a4c] shadow-none placeholder:text-slate-400 focus-visible:border-blue-600 focus-visible:ring-blue-600/20"
            />

            <p className="mt-2 text-xs text-slate-500">
              Use pelo menos 6 caracteres.
            </p>
          </div>

          <div>
            <Label
              htmlFor="repeat-password"
              className="text-sm font-bold text-slate-700"
            >
              Confirme a nova senha
            </Label>

            <Input
              id="repeat-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="Digite a senha novamente"
              required
              value={repeatPassword}
              disabled={isLoading}
              onChange={(event) => setRepeatPassword(event.target.value)}
              className="mt-2 h-12 rounded-xl border-blue-100 bg-white px-4 text-[#071a4c] shadow-none placeholder:text-slate-400 focus-visible:border-blue-600 focus-visible:ring-blue-600/20"
            />
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-sm font-bold text-blue-900">Proteja sua conta</p>

            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Evite utilizar a mesma senha de outros aplicativos, redes sociais
              ou contas de e-mail.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full rounded-xl bg-blue-700 text-base font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Salvando nova senha..." : "Salvar nova senha"}
          </Button>
        </div>
      </form>
    </div>
  );
}
