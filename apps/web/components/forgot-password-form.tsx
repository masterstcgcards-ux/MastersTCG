"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const supabase = createClient();

    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/update-password`,
        },
      );

      if (resetError) {
        throw resetError;
      }

      setSuccess(true);
    } catch (resetError: unknown) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Não foi possível enviar o e-mail de recuperação.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      {success ? (
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-50 text-4xl font-black text-emerald-600">
            ✓
          </div>

          <span className="mt-7 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
            Solicitação enviada
          </span>

          <h2 className="mt-5 text-3xl font-black tracking-tight text-[#071a4c] sm:text-4xl">
            Confira seu e-mail
          </h2>

          <p className="mt-4 leading-relaxed text-slate-600">
            Se existir uma conta cadastrada com o e-mail informado, você
            receberá uma mensagem com o link para criar uma nova senha.
          </p>

          <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-left">
            <p className="font-bold text-blue-900">Não encontrou a mensagem?</p>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Aguarde alguns minutos e verifique também as pastas de spam, lixo
              eletrônico ou promoções.
            </p>
          </div>

          <Link
            href="/auth/login"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-600"
          >
            Voltar para o login
          </Link>
        </div>
      ) : (
        <>
          <div>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Recuperar senha
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-[#071a4c] sm:text-4xl">
              Esqueceu sua senha?
            </h2>

            <p className="mt-3 leading-relaxed text-slate-600">
              Digite o e-mail da sua conta e enviaremos um link para você criar
              uma nova senha.
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="mt-8">
            <div>
              <Label
                htmlFor="email"
                className="text-sm font-bold text-slate-700"
              >
                E-mail da conta
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

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700"
              >
                Não foi possível enviar o e-mail de recuperação. Verifique o
                endereço informado e tente novamente.
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-6 h-12 w-full rounded-xl bg-blue-700 text-base font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>

            <div className="mt-6 border-t border-blue-100 pt-6 text-center text-sm text-slate-600">
              Lembrou sua senha?{" "}
              <Link
                href="/auth/login"
                className="font-bold text-blue-700 transition hover:text-blue-600 hover:underline"
              >
                Voltar para o login
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
