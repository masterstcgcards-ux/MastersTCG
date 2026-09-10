"use client";

import { useRef, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

type ReviewFormProps = {
  orderId: string;
  reviewedName: string;
  onSubmitted?: () => void;
};

export function ReviewForm({
  orderId,
  reviewedName,
  onSubmitted,
}: ReviewFormProps) {
  const submittingRef = useRef(false);

  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);
    const supabase = createClient();

    const { error: reviewError } = await supabase.rpc(
      "create_marketplace_review",
      {
        p_order_id: orderId,
        p_rating: rating,
        p_comment: String(formData.get("comment") || ""),
      },
    );

    if (reviewError) {
      setError(reviewError.message || "Não foi possível enviar a avaliação.");
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setMessage("Avaliação enviada. Obrigado por compartilhar sua experiência!");
    submittingRef.current = false;
    setSubmitting(false);
    onSubmitted?.();
  }

  if (submitted) {
    return (
      <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        {message}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5"
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
        Avaliar negociação
      </p>

      <h4 className="mt-2 font-bold">Como foi negociar com {reviewedName}?</h4>

      <div
        className="mt-4 flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Nota da avaliação"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            onClick={() => setRating(star)}
            className={`rounded-lg border px-3 py-2 text-xl transition ${
              star <= rating
                ? "border-yellow-400/50 bg-yellow-500/15 text-yellow-300"
                : "border-white/10 text-zinc-600 hover:text-yellow-300"
            }`}
            aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
          >
            ★
          </button>
        ))}
      </div>

      <p className="mt-2 text-sm font-semibold text-yellow-100">
        {rating} {rating === 1 ? "estrela" : "estrelas"}
      </p>

      <div className="mt-4">
        <label
          htmlFor={`review-comment-${orderId}`}
          className="mb-2 block text-sm font-semibold"
        >
          Comentário opcional
        </label>

        <textarea
          id={`review-comment-${orderId}`}
          name="comment"
          rows={3}
          maxLength={1000}
          placeholder="Conte como foi a negociação, comunicação e entrega."
          className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-yellow-400"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black hover:bg-yellow-400 disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Enviar avaliação"}
      </button>
    </form>
  );
}
