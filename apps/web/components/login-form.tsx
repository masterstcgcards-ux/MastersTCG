"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const supabase = createClient();

    setIsLoading(true);
    setError(null);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        throw loginError;
      }

      router.push("/protected");
      router.refresh();
    } catch (loginError: unknown) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Não foi possível entrar na sua conta.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <div>
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
          Bem-vindo de volta
        </span>

        <h2 className="mt-5 text-3xl font-black tracking-tight text-[#071a4c] sm:text-4xl">
          Entre na sua conta
        </h2>

        <p className="mt-3 leading-relaxed text-slate-600">
          Acesse sua coleção, seus decks e todas as áreas do MastersTCG.
        </p>
      </div>

      <form onSubmit={handleLogin} className="mt-8">
        <div className="flex flex-col gap-5">
          <div>
            <Label htmlFor="email" className="text-sm font-bold text-slate-700">
              E-mail
            </Label>

            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seuemail@exemplo.com"
              required
              value={email}
              disabled={isLoading}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 rounded-xl border-blue-100 bg-white px-4 text-[#071a4c] shadow-none placeholder:text-slate-400 focus-visible:border-blue-600 focus-visible:ring-blue-600/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="password"
                className="text-sm font-bold text-slate-700"
              >
                Senha
              </Label>

              <Link
                href="/auth/forgot-password"
                className="text-sm font-semibold text-blue-700 transition hover:text-blue-600 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>

            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              disabled={isLoading}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 rounded-xl border-blue-100 bg-white px-4 text-[#071a4c] shadow-none focus-visible:border-blue-600 focus-visible:ring-blue-600/20"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700"
            >
              Não foi possível entrar. Confira seu e-mail e sua senha e tente
              novamente.
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full rounded-xl bg-blue-700 text-base font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </div>

        <div className="mt-6 border-t border-blue-100 pt-6 text-center text-sm text-slate-600">
          Ainda não possui uma conta?{" "}
          <Link
            href="/auth/sign-up"
            className="font-bold text-blue-700 transition hover:text-blue-600 hover:underline"
          >
            Criar minha conta
          </Link>
        </div>
      </form>
    </div>
  );
}
