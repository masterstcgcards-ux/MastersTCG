"use client";

import { useRef, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

type ReportTargetType = "user" | "listing" | "order" | "auction";

type ReportFormProps = {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
};

const reasonLabels: Record<string, string> = {
  fraud: "Suspeita de fraude",
  counterfeit: "Carta falsa ou falsificada",
  non_delivery: "Produto não entregue",
  non_payment: "Pagamento não realizado",
  abusive_behavior: "Comportamento abusivo",
  misleading_information: "Informações enganosas",
  prohibited_content: "Conteúdo proibido",
  other: "Outro motivo",
};

export function ReportForm({
  targetType,
  targetId,
  targetLabel = "este item",
}: ReportFormProps) {
  const submittingRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const supabase = createClient();

    const { error: reportError } = await supabase.rpc(
      "create_marketplace_report",
      {
        p_target_type: targetType,
        p_target_id: targetId,
        p_reason: String(formData.get("reason") || ""),
        p_details: String(formData.get("details") || ""),
      },
    );

    if (reportError) {
      setError(reportError.message || "Não foi possível enviar a denúncia.");
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
    submittingRef.current = false;
  }

  if (submitted) {
    return (
      <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        Denúncia enviada para análise da equipe MastersTCG.
      </div>
    );
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setError("");
        }}
        className="text-sm font-semibold text-red-300 underline-offset-4 hover:text-red-200 hover:underline"
      >
        {open ? "Fechar denúncia" : `Denunciar ${targetLabel}`}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-5"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
            Central de segurança
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Envie apenas denúncias verdadeiras e descreva o problema com
            clareza. A equipe administrativa fará a análise.
          </p>

          <div className="mt-5">
            <label
              htmlFor={`report-reason-${targetType}-${targetId}`}
              className="mb-2 block text-sm font-semibold"
            >
              Motivo
            </label>

            <select
              id={`report-reason-${targetType}-${targetId}`}
              name="reason"
              defaultValue="misleading_information"
              className="w-full rounded-xl border border-white/10 bg-[#0d0d16] px-4 py-3 outline-none focus:border-red-400"
            >
              {Object.entries(reasonLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <label
              htmlFor={`report-details-${targetType}-${targetId}`}
              className="mb-2 block text-sm font-semibold"
            >
              Explique o ocorrido
            </label>

            <textarea
              id={`report-details-${targetType}-${targetId}`}
              name="details"
              rows={5}
              minLength={10}
              maxLength={2000}
              placeholder="Descreva o problema e informe os detalhes necessários para a análise."
              required
              className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-red-400"
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
            className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar denúncia"}
          </button>
        </form>
      )}
    </div>
  );
}
