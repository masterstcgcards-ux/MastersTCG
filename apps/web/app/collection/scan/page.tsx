"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/15 bg-[#181822] px-4 py-3 text-white outline-none focus:border-violet-400";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function validateImage(file: File, imageName: string) {
  if (!extensions[file.type]) {
    return `${imageName}: use uma imagem JPG, PNG ou WebP. HEIC ainda não é aceito.`;
  }

  if (file.size === 0 || file.size > 10 * 1024 * 1024) {
    return `${imageName}: a imagem deve ter conteúdo e no máximo 10 MB.`;
  }

  return null;
}

export default function ScanPage() {
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [backPhoto, setBackPhoto] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState("");
  const [backPreview, setBackPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!frontPhoto) {
      setFrontPreview("");
      return;
    }

    const url = URL.createObjectURL(frontPhoto);
    setFrontPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [frontPhoto]);

  useEffect(() => {
    if (!backPhoto) {
      setBackPreview("");
      return;
    }

    const url = URL.createObjectURL(backPhoto);
    setBackPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [backPhoto]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current || success) return;

    setMessage("");

    const form = new FormData(event.currentTarget);
    const name = String(form.get("card_name") || "").trim();
    const quantity = Number(form.get("quantity"));

    if (!name) {
      setMessage("Informe o nome da carta.");
      return;
    }

    if (!frontPhoto) {
      setMessage("Selecione uma foto da frente da carta.");
      return;
    }

    const frontValidation = validateImage(frontPhoto, "Foto da frente");

    if (frontValidation) {
      setMessage(frontValidation);
      return;
    }

    if (backPhoto) {
      const backValidation = validateImage(backPhoto, "Foto do verso");

      if (backValidation) {
        setMessage(backValidation);
        return;
      }
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      setMessage("A quantidade deve ser um número inteiro entre 1 e 999.");
      return;
    }

    submitting.current = true;
    setSaving(true);

    const supabase = createClient();
    const uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Sua sessão expirou. Entre novamente e volte para esta página.",
        );
      }

      const cardId = crypto.randomUUID();
      const frontExtension = extensions[frontPhoto.type];
      const frontImagePath = `${user.id}/${cardId}/front.${frontExtension}`;

      const { error: frontUploadError } = await supabase.storage
        .from("card-scans")
        .upload(frontImagePath, frontPhoto, {
          contentType: frontPhoto.type,
          upsert: false,
        });

      if (frontUploadError) {
        throw new Error(
          `Não foi possível enviar a foto da frente: ${frontUploadError.message}`,
        );
      }

      uploadedPaths.push(frontImagePath);

      let backImagePath: string | null = null;

      if (backPhoto) {
        const backExtension = extensions[backPhoto.type];
        backImagePath = `${user.id}/${cardId}/back.${backExtension}`;

        const { error: backUploadError } = await supabase.storage
          .from("card-scans")
          .upload(backImagePath, backPhoto, {
            contentType: backPhoto.type,
            upsert: false,
          });

        if (backUploadError) {
          throw new Error(
            `Não foi possível enviar a foto do verso: ${backUploadError.message}`,
          );
        }

        uploadedPaths.push(backImagePath);
      }

      const { error: insertError } = await supabase.from("user_cards").insert({
        id: cardId,
        user_id: user.id,
        card_name: name,
        set_name: String(form.get("set_name") || "").trim() || null,
        card_number: String(form.get("card_number") || "").trim() || null,
        quantity,
        card_condition: String(form.get("card_condition")),
        language: String(form.get("language")),
        finish: String(form.get("finish")),
        notes: String(form.get("notes") || "").trim() || null,
        front_image_path: frontImagePath,
        back_image_path: backImagePath,
        source: "manual",
      });

      if (insertError) {
        throw new Error(
          `Não foi possível salvar a carta: ${insertError.message}`,
        );
      }

      uploadedPaths.length = 0;
      setSuccess(true);
      setMessage("Carta adicionada à sua coleção!");
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("card-scans").remove(uploadedPaths);
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro inesperado. Confira sua conexão.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/collection"
            className="text-xl font-black tracking-tight"
          >
            MASTERS<span className="text-violet-500">TCG</span>
          </Link>

          <Link
            href="/collection"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Voltar à coleção
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
          Pokémon TCG
        </p>

        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Adicionar carta
        </h1>

        <p className="mt-3 max-w-2xl text-zinc-400">
          Envie uma foto nítida da frente e, se desejar, do verso da carta. As
          imagens permanecem privadas na sua coleção.
        </p>

        {success ? (
          <div className="mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-8">
            <p role="status" className="text-lg font-bold text-green-300">
              {message}
            </p>

            <p className="mt-3 text-zinc-300">
              Os dados e as fotos foram salvos.
            </p>

            <Link
              href="/collection"
              className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500"
            >
              Ver minha coleção
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8">
            <fieldset
              disabled={saving}
              className="grid min-w-0 gap-8 disabled:opacity-70 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#11111b] p-5">
                  <label htmlFor="front_photo" className="block font-semibold">
                    Foto da frente *
                  </label>

                  <p className="mt-2 text-sm text-zinc-400">
                    JPG, PNG ou WebP, até 10 MB.
                  </p>

                  <input
                    id="front_photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(event) => {
                      setFrontPhoto(event.target.files?.[0] || null);
                      setMessage("");
                    }}
                    className="mt-5 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-white"
                  />

                  <div className="mt-5 flex min-h-72 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
                    {frontPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={frontPreview}
                        alt="Prévia da frente da carta"
                        className="max-h-96 max-w-full rounded-lg object-contain"
                      />
                    ) : (
                      <p className="text-center text-sm text-zinc-500">
                        A frente da carta aparecerá aqui.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#11111b] p-5">
                  <label htmlFor="back_photo" className="block font-semibold">
                    Foto do verso
                  </label>

                  <p className="mt-2 text-sm text-zinc-400">
                    Opcional. JPG, PNG ou WebP, até 10 MB.
                  </p>

                  <input
                    id="back_photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      setBackPhoto(event.target.files?.[0] || null);
                      setMessage("");
                    }}
                    className="mt-5 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-4 file:py-2 file:text-white"
                  />

                  <div className="mt-5 flex min-h-72 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
                    {backPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={backPreview}
                        alt="Prévia do verso da carta"
                        className="max-h-96 max-w-full rounded-lg object-contain"
                      />
                    ) : (
                      <p className="text-center text-sm text-zinc-500">
                        O verso é opcional e aparecerá aqui.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-5 rounded-2xl border border-white/10 bg-[#11111b] p-6">
                <div>
                  <label htmlFor="card_name">Nome da carta *</label>

                  <input
                    id="card_name"
                    name="card_name"
                    required
                    maxLength={150}
                    placeholder="Ex.: Pikachu"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label htmlFor="set_name">Coleção / expansão</label>

                  <input
                    id="set_name"
                    name="set_name"
                    maxLength={150}
                    placeholder="Nome da expansão"
                    className={fieldClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="card_number">Número</label>

                    <input
                      id="card_number"
                      name="card_number"
                      maxLength={30}
                      placeholder="Ex.: 025/165"
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="quantity">Quantidade *</label>

                    <input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min={1}
                      max={999}
                      step={1}
                      defaultValue={1}
                      required
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="card_condition">
                    Estado de conservação *
                  </label>

                  <select
                    id="card_condition"
                    name="card_condition"
                    required
                    defaultValue=""
                    className={fieldClass}
                  >
                    <option value="" disabled>
                      Selecione o estado
                    </option>
                    <option value="mint">Impecável (Mint)</option>
                    <option value="near_mint">
                      Quase impecável (Near Mint)
                    </option>
                    <option value="excellent">Excelente</option>
                    <option value="good">Bom</option>
                    <option value="played">Com desgaste</option>
                    <option value="poor">Muito danificada</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="language">Idioma</label>

                    <select
                      id="language"
                      name="language"
                      defaultValue="pt-BR"
                      className={fieldClass}
                    >
                      <option value="pt-BR">Português</option>
                      <option value="en">Inglês</option>
                      <option value="ja">Japonês</option>
                      <option value="es">Espanhol</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="finish">Acabamento</label>

                    <select
                      id="finish"
                      name="finish"
                      defaultValue="normal"
                      className={fieldClass}
                    >
                      <option value="normal">Normal</option>
                      <option value="holo">Holográfica</option>
                      <option value="reverse_holo">Reverse holo</option>
                      <option value="special">Especial</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="notes">Observações</label>

                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    maxLength={1000}
                    placeholder="Detalhes adicionais sobre a carta"
                    className={fieldClass}
                  />
                </div>

                {message && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
                  >
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando carta..." : "Adicionar à coleção"}
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </section>
    </main>
  );
}
