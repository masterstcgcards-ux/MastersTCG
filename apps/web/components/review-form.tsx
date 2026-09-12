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
      <div
        role="status"
        className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"
      >
        {message}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 overflow-hidden rounded-2xl border border-amber-200 bg-white"
    >
      <div className="border-b border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
          Avaliar negociação
        </p>

        <h4 className="mt-2 font-black text-[#071a4c]">
          Como foi negociar com {reviewedName}?
        </h4>
      </div>

      <div className="p-5">
        <div
          className="flex flex-wrap gap-2"
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
              className={`rounded-xl border px-3 py-2 text-xl transition ${
                star <= rating
                  ? "border-amber-300 bg-amber-100 text-amber-500 shadow-sm"
                  : "border-slate-200 bg-white text-slate-300 hover:border-amber-200 hover:text-amber-400"
              }`}
              aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
            >
              ★
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm font-bold text-amber-700">
          {rating} {rating === 1 ? "estrela" : "estrelas"}
        </p>

        <div className="mt-5">
          <label
            htmlFor={`review-comment-${orderId}`}
            className="mb-2 block text-sm font-bold text-[#071a4c]"
          >
            Comentário opcional
          </label>

          <textarea
            id={`review-comment-${orderId}`}
            name="comment"
            rows={3}
            maxLength={1000}
            placeholder="Conte como foi a negociação, comunicação e entrega."
            className="w-full resize-none rounded-xl border border-amber-200 bg-white px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-[#071a4c] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Enviando..." : "Enviar avaliação"}
        </button>
      </div>
    </form>
  );
}
