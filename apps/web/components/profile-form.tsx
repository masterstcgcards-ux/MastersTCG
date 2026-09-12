"use client";

import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

type ProfileData = {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  created_at: string | null;
  totalCards: number;
};

type ProfileFormProps = {
  profile: ProfileData;
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const labelClass = "text-sm font-bold text-[#071a4c]";

export function ProfileForm({ profile }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setMessage("");
    setSuccess(false);

    const normalizedDisplayName = displayName.trim();
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedBio = bio.trim();

    if (normalizedDisplayName.length < 2 || normalizedDisplayName.length > 80) {
      setMessage("O nome deve ter entre 2 e 80 caracteres.");
      return;
    }

    if (!/^[a-z0-9._]{3,30}$/.test(normalizedUsername)) {
      setMessage(
        "O usuário deve ter entre 3 e 30 caracteres e usar apenas letras minúsculas, números, ponto ou underline.",
      );
      return;
    }

    if (normalizedBio.length > 300) {
      setMessage("A biografia deve ter no máximo 300 caracteres.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== profile.id) {
        throw new Error("Sua sessão expirou. Entre novamente.");
      }

      const { data: usernameOwners, error: usernameError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalizedUsername)
        .neq("id", user.id)
        .limit(1);

      if (usernameError) {
        throw new Error(
          `Não foi possível verificar o nome de usuário: ${usernameError.message}`,
        );
      }

      if (usernameOwners && usernameOwners.length > 0) {
        throw new Error(
          "Esse nome de usuário já está sendo utilizado. Escolha outro.",
        );
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: normalizedDisplayName,
          username: normalizedUsername,
          bio: normalizedBio || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select("display_name, username, bio")
        .maybeSingle();

      if (updateError) {
        throw new Error(
          `Não foi possível salvar o perfil: ${updateError.message}`,
        );
      }

      if (!updatedProfile) {
        throw new Error(
          "Seu perfil não foi encontrado. Saia da conta e entre novamente.",
        );
      }

      setDisplayName(updatedProfile.display_name || "");
      setUsername(updatedProfile.username || "");
      setBio(updatedProfile.bio || "");
      setSuccess(true);
      setMessage("Perfil atualizado com sucesso.");
    } catch (error) {
      setSuccess(false);
      setMessage(
        error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
      );
    } finally {
      setSaving(false);
    }
  }

  const membershipDate = profile.created_at
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(profile.created_at))
    : "Data não disponível";

  return (
    <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="relative h-fit overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 p-7 text-white shadow-lg">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-yellow-400/25 blur-3xl"
        />

        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white/20 bg-yellow-400 text-4xl font-black text-[#071a4c] shadow-xl">
            {(displayName || username || "M").charAt(0).toUpperCase()}
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-yellow-300">
            Perfil Master
          </p>

          <h2 className="mt-2 break-words text-3xl font-black">
            {displayName || "Novo Master"}
          </h2>

          <p className="mt-2 break-words text-blue-100">
            @{username || "escolha-seu-usuario"}
          </p>

          {bio && (
            <p className="mt-5 whitespace-pre-wrap break-words leading-relaxed text-blue-50">
              {bio}
            </p>
          )}

          <dl className="mt-8 divide-y divide-white/15 border-t border-white/15">
            <div className="flex justify-between gap-4 py-4">
              <dt className="text-blue-100">Cartas</dt>
              <dd className="font-black text-yellow-300">
                {profile.totalCards}
              </dd>
            </div>

            <div className="py-4">
              <dt className="text-blue-100">Master desde</dt>
              <dd className="mt-1 font-bold text-white">{membershipDate}</dd>
            </div>
          </dl>
        </div>
      </aside>

      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
          Editar perfil
        </p>

        <h2 className="mt-2 text-2xl font-black text-[#071a4c]">
          Suas informações
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Mantenha seus dados atualizados para ser reconhecido pela comunidade.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className={labelClass}>
              E-mail da conta
            </label>

            <input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className={`${fieldClass} cursor-not-allowed bg-slate-50 opacity-70`}
            />

            <p className="mt-2 text-xs text-slate-500">
              O e-mail não pode ser alterado nesta tela.
            </p>
          </div>

          <div>
            <label htmlFor="display_name" className={labelClass}>
              Nome de exibição *
            </label>

            <input
              id="display_name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
              placeholder="Como você quer ser chamado"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="username" className={labelClass}>
              Nome de usuário *
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 font-bold text-blue-600">
                @
              </span>

              <input
                id="username"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value.toLowerCase().replace(/\s/g, ""),
                  )
                }
                minLength={3}
                maxLength={30}
                required
                placeholder="seu.usuario"
                className={`${fieldClass} pl-9`}
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Use letras minúsculas, números, ponto ou underline.
            </p>
          </div>

          <div>
            <div className="flex justify-between gap-4">
              <label htmlFor="bio" className={labelClass}>
                Biografia
              </label>

              <span className="text-xs font-semibold text-slate-500">
                {bio.length}/300
              </span>
            </div>

            <textarea
              id="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={5}
              maxLength={300}
              placeholder="Conte um pouco sobre você e sua coleção."
              className={`${fieldClass} resize-none`}
            />
          </div>

          {message && (
            <p
              role={success ? "status" : "alert"}
              className={`rounded-xl border p-4 text-sm font-semibold ${
                success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 px-6 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Salvando perfil..." : "Salvar perfil"}
          </button>
        </form>
      </section>
    </div>
  );
}
