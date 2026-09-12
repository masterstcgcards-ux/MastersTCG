"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-[#071a4c] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

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
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50/40 to-white text-[#071a4c]">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-4 sm:px-6">
          <Link href="/" aria-label="MastersTCG — início" className="shrink-0">
            <Image
              src="/masters-logo.png"
              alt="MastersTCG"
              width={1000}
              height={270}
              priority
              className="h-auto w-[190px] sm:w-[230px]"
            />
          </Link>

          <Link
            href="/collection"
            className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 transition hover:border-blue-500 hover:bg-blue-50"
          >
            ← Voltar à coleção
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
          <span aria-hidden="true">✦</span>
          Pokémon TCG
        </span>

        <h1 className="mt-5 text-4xl font-black tracking-tight text-[#071a4c] sm:text-5xl">
          Adicionar carta
        </h1>

        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
          Envie uma foto nítida da frente e, se desejar, do verso da carta. As
          imagens permanecem privadas na sua coleção.
        </p>

        {success ? (
          <div className="mt-8 rounded-3xl border border-green-200 bg-green-50 p-8 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
              ✓
            </div>

            <p role="status" className="mt-5 text-xl font-black text-green-700">
              {message}
            </p>

            <p className="mt-3 text-slate-600">
              Os dados e as fotos foram salvos.
            </p>

            <Link
              href="/collection"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
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
              <div className="grid min-w-0 gap-6 sm:grid-cols-2">
                <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <label
                        htmlFor="front_photo"
                        className="block font-black text-[#071a4c]"
                      >
                        Foto da frente *
                      </label>

                      <p className="mt-2 text-sm text-slate-500">
                        JPG, PNG ou WebP, até 10 MB.
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                      Obrigatória
                    </span>
                  </div>

                  <input
                    id="front_photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(event) => {
                      setFrontPhoto(event.target.files?.[0] || null);
                      setMessage("");
                    }}
                    className="mt-5 block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2.5 file:font-bold file:text-white hover:file:bg-blue-700"
                  />

                  <div className="mt-5 flex aspect-[2.5/3.5] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4">
                    {frontPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={frontPreview}
                        alt="Prévia da frente da carta"
                        className="h-full w-full rounded-xl object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-4xl text-blue-300">▣</p>
                        <p className="mt-3 text-sm font-semibold text-slate-500">
                          A frente da carta aparecerá aqui.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <label
                        htmlFor="back_photo"
                        className="block font-black text-[#071a4c]"
                      >
                        Foto do verso
                      </label>

                      <p className="mt-2 text-sm text-slate-500">
                        JPG, PNG ou WebP, até 10 MB.
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                      Opcional
                    </span>
                  </div>

                  <input
                    id="back_photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      setBackPhoto(event.target.files?.[0] || null);
                      setMessage("");
                    }}
                    className="mt-5 block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-[#071a4c] file:px-4 file:py-2.5 file:font-bold file:text-white hover:file:bg-blue-900"
                  />

                  <div className="mt-5 flex aspect-[2.5/3.5] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4">
                    {backPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={backPreview}
                        alt="Prévia do verso da carta"
                        className="h-full w-full rounded-xl object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-4xl text-blue-300">▣</p>
                        <p className="mt-3 text-sm font-semibold text-slate-500">
                          O verso é opcional e aparecerá aqui.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-5 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
                <div>
                  <label
                    htmlFor="card_name"
                    className="font-bold text-[#071a4c]"
                  >
                    Nome da carta *
                  </label>

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
                  <label
                    htmlFor="set_name"
                    className="font-bold text-[#071a4c]"
                  >
                    Coleção / expansão
                  </label>

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
                    <label
                      htmlFor="card_number"
                      className="font-bold text-[#071a4c]"
                    >
                      Número
                    </label>

                    <input
                      id="card_number"
                      name="card_number"
                      maxLength={30}
                      placeholder="025/165"
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="quantity"
                      className="font-bold text-[#071a4c]"
                    >
                      Quantidade *
                    </label>

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
                  <label
                    htmlFor="card_condition"
                    className="font-bold text-[#071a4c]"
                  >
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
                    <label
                      htmlFor="language"
                      className="font-bold text-[#071a4c]"
                    >
                      Idioma
                    </label>

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
                    <label
                      htmlFor="finish"
                      className="font-bold text-[#071a4c]"
                    >
                      Acabamento
                    </label>

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
                  <label htmlFor="notes" className="font-bold text-[#071a4c]">
                    Observações
                  </label>

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
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
                  >
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-12 w-full rounded-xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
