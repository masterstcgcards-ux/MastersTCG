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

export default function ScanPage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(photo);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [photo]);

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

    if (!photo) {
      setMessage("Selecione uma foto da frente da carta.");
      return;
    }

    const extension = extensions[photo.type];

    if (!extension) {
      setMessage("Use uma imagem JPG, PNG ou WebP. HEIC ainda não é aceito.");
      return;
    }

    if (photo.size === 0 || photo.size > 10 * 1024 * 1024) {
      setMessage("A imagem deve ter conteúdo e no máximo 10 MB.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      setMessage("A quantidade deve ser um número inteiro entre 1 e 999.");
      return;
    }

    submitting.current = true;
    setSaving(true);

    try {
      const supabase = createClient();

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
      const imagePath = `${user.id}/${cardId}/front.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("card-scans")
        .upload(imagePath, photo, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Não foi possível enviar a foto: ${uploadError.message}`,
        );
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
        front_image_path: imagePath,
        source: "manual",
      });

      if (insertError) {
        // Remove somente a foto desta tentativa se o cadastro falhar.
        const { error: cleanupError } = await supabase.storage
          .from("card-scans")
          .remove([imagePath]);

        throw new Error(
          `Não foi possível salvar a carta: ${insertError.message}${
            cleanupError
              ? " A foto ficou armazenada sem cadastro; avise antes de tentar novamente."
              : ""
          }`,
        );
      }

      setSuccess(true);
      setMessage("Carta adicionada à sua coleção!");
    } catch (error) {
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
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

      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
          Pokémon TCG
        </p>

        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Adicionar carta
        </h1>

        <p className="mt-3 max-w-2xl text-zinc-400">
          Envie uma foto nítida da frente da carta e preencha os dados. Nesta
          versão, o cadastro é manual e a foto permanece privada.
        </p>

        {success ? (
          <div className="mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-8">
            <p role="status" className="text-lg font-bold text-green-300">
              {message}
            </p>

            <p className="mt-3 text-zinc-300">
              Os dados e a foto foram salvos.
            </p>

            <a
              href="/collection"
              className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500"
            >
              Ver minha coleção
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8">
            <fieldset
              disabled={saving}
              className="grid min-w-0 gap-8 disabled:opacity-70 md:grid-cols-2"
            >
              <div className="rounded-2xl border border-white/10 bg-[#11111b] p-6">
                <label htmlFor="photo" className="block font-semibold">
                  Foto da frente *
                </label>

                <p className="mt-2 text-sm text-zinc-400">
                  JPG, PNG ou WebP, até 10 MB. Evite reflexos e enquadre a carta
                  inteira.
                </p>

                <input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(event) => {
                    setPhoto(event.target.files?.[0] || null);
                    setMessage("");
                  }}
                  className="mt-5 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-white"
                />

                <div className="mt-6 flex min-h-72 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
                  {preview ? (
                    // Prévia local do arquivo, sem publicar a imagem.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt="Prévia da carta selecionada"
                      className="max-h-96 max-w-full rounded-lg object-contain"
                    />
                  ) : (
                    <p className="text-center text-sm text-zinc-500">
                      A prévia da foto aparecerá aqui.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-5">
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
                    rows={3}
                    maxLength={2000}
                    placeholder="Detalhes sobre sua carta"
                    className={fieldClass}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-violet-600 px-6 py-4 font-bold hover:bg-violet-500 disabled:cursor-wait"
                >
                  {saving
                    ? "Enviando e salvando..."
                    : "Salvar na minha coleção"}
                </button>
              </div>
            </fieldset>

            {message && (
              <p
                role="alert"
                className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
              >
                {message}
              </p>
            )}

            {saving && (
              <p role="status" className="mt-4 text-sm text-zinc-400">
                Aguarde nesta página até concluir o envio.
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
