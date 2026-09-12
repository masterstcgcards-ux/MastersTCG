"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setError(null);

    if (password !== repeatPassword) {
      setError("As senhas informadas não são iguais.");
      return;
    }

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    const supabase = createClient();

    setIsLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      router.push("/auth/sign-up-success");
    } catch (signUpError: unknown) {
      setError(
        signUpError instanceof Error
          ? signUpError.message
          : "Não foi possível criar sua conta.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <div>
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
          Crie sua conta
        </span>

        <h2 className="mt-5 text-3xl font-black tracking-tight text-[#071a4c] sm:text-4xl">
          Torne-se um Master
        </h2>

        <p className="mt-3 leading-relaxed text-slate-600">
          Cadastre-se gratuitamente e comece a construir sua coleção.
        </p>
      </div>

      <form onSubmit={handleSignUp} className="mt-8">
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
            <Label
              htmlFor="password"
              className="text-sm font-bold text-slate-700"
            >
              Senha
            </Label>

            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              disabled={isLoading}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 rounded-xl border-blue-100 bg-white px-4 text-[#071a4c] shadow-none focus-visible:border-blue-600 focus-visible:ring-blue-600/20"
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
              Confirme sua senha
            </Label>

            <Input
              id="repeat-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={repeatPassword}
              disabled={isLoading}
              onChange={(event) => setRepeatPassword(event.target.value)}
              className="mt-2 h-12 rounded-xl border-blue-100 bg-white px-4 text-[#071a4c] shadow-none focus-visible:border-blue-600 focus-visible:ring-blue-600/20"
            />
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
            {isLoading ? "Criando sua conta..." : "Criar minha conta"}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
          Ao criar sua conta, você concorda em utilizar o MastersTCG de forma
          responsável e segura.
        </p>

        <div className="mt-6 border-t border-blue-100 pt-6 text-center text-sm text-slate-600">
          Já possui uma conta?{" "}
          <Link
            href="/auth/login"
            className="font-bold text-blue-700 transition hover:text-blue-600 hover:underline"
          >
            Entrar
          </Link>
        </div>
      </form>
    </div>
  );
}
