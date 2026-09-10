"use client";

import { useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type MarketplaceReport = {
  report_id: string;
  reporter_id: string;
  reporter_display_name: string | null;
  reporter_username: string | null;
  reported_user_id: string | null;
  reported_user_display_name: string | null;
  reported_user_username: string | null;
  listing_id: string | null;
  order_id: string | null;
  auction_id: string | null;
  target_type: string;
  target_title: string;
  reason: string;
  details: string;
  report_status: string;
  resolution_notes: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

type ReportsManagerProps = {
  initialReports: MarketplaceReport[];
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  reviewing: "Em análise",
  resolved: "Resolvida",
  dismissed: "Rejeitada",
};

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-200",
  reviewing: "bg-blue-500/15 text-blue-200",
  resolved: "bg-emerald-500/15 text-emerald-200",
  dismissed: "bg-zinc-500/15 text-zinc-300",
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

const targetLabels: Record<string, string> = {
  user: "Usuário",
  listing: "Anúncio",
  order: "Pedido",
  auction: "Leilão",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ReportsManager({ initialReports }: ReportsManagerProps) {
  const updatingRef = useRef(false);

  const [reports, setReports] = useState(initialReports);
  const [statusFilter, setStatusFilter] = useState("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredReports = useMemo(() => {
    if (statusFilter === "all") {
      return reports;
    }

    if (statusFilter === "open") {
      return reports.filter((report) =>
        ["pending", "reviewing"].includes(report.report_status),
      );
    }

    return reports.filter((report) => report.report_status === statusFilter);
  }, [reports, statusFilter]);

  async function updateReport(
    report: MarketplaceReport,
    newStatus: "reviewing" | "resolved" | "dismissed",
  ) {
    if (updatingRef.current) {
      return;
    }

    if (
      ["resolved", "dismissed"].includes(newStatus) &&
      !window.confirm(
        newStatus === "resolved"
          ? "Confirma que esta denúncia foi resolvida?"
          : "Confirma que esta denúncia será rejeitada?",
      )
    ) {
      return;
    }

    updatingRef.current = true;
    setUpdatingId(report.report_id);
    setMessage("");
    setError("");

    const supabase = createClient();

    const { error: updateError } = await supabase.rpc(
      "review_marketplace_report",
      {
        p_report_id: report.report_id,
        p_status: newStatus,
        p_resolution_notes: notes[report.report_id] || "",
      },
    );

    if (updateError) {
      setError(updateError.message || "Não foi possível atualizar a denúncia.");
      updatingRef.current = false;
      setUpdatingId(null);
      return;
    }

    setReports((current) =>
      current.map((item) =>
        item.report_id === report.report_id
          ? {
              ...item,
              report_status: newStatus,
              resolution_notes: notes[report.report_id] || null,
              updated_at: new Date().toISOString(),
            }
          : item,
      ),
    );

    setMessage("Denúncia atualizada com sucesso.");
    updatingRef.current = false;
    setUpdatingId(null);
  }

  return (
    <div>
      <section className="rounded-2xl border border-white/10 bg-[#13131d] p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black">Central de denúncias</h2>

            <p className="mt-2 text-sm text-zinc-400">
              Analise relatos enviados pelos usuários e registre a decisão.
            </p>
          </div>

          <div className="w-full md:max-w-xs">
            <label
              htmlFor="report-status-filter"
              className="mb-2 block text-sm font-semibold"
            >
              Filtrar por situação
            </label>

            <select
              id="report-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0d0d16] px-4 py-3 outline-none focus:border-violet-500"
            >
              <option value="open">Pendentes e em análise</option>
              <option value="all">Todas</option>
              <option value="pending">Pendentes</option>
              <option value="reviewing">Em análise</option>
              <option value="resolved">Resolvidas</option>
              <option value="dismissed">Rejeitadas</option>
            </select>
          </div>
        </div>
      </section>

      {message && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"
        >
          {error}
        </div>
      )}

      {filteredReports.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-12 text-center text-zinc-400">
          Nenhuma denúncia encontrada neste filtro.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {filteredReports.map((report) => {
            const updating = updatingId === report.report_id;

            const reporterName =
              report.reporter_display_name ||
              report.reporter_username ||
              "Usuário";

            const reportedName =
              report.reported_user_display_name ||
              report.reported_user_username ||
              "Usuário não identificado";

            return (
              <article
                key={report.report_id}
                className="rounded-2xl border border-white/10 bg-[#13131d] p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                      {targetLabels[report.target_type] || report.target_type}
                    </p>

                    <h3 className="mt-2 break-words text-2xl font-black">
                      {report.target_title}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      statusStyles[report.report_status] || statusStyles.pending
                    }`}
                  >
                    {statusLabels[report.report_status] || report.report_status}
                  </span>
                </div>

                <dl className="mt-6 grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <dt className="text-zinc-500">Denunciante</dt>
                    <dd className="mt-1 font-semibold">{reporterName}</dd>
                  </div>

                  <div>
                    <dt className="text-zinc-500">Denunciado</dt>
                    <dd className="mt-1 font-semibold">{reportedName}</dd>
                  </div>

                  <div>
                    <dt className="text-zinc-500">Motivo</dt>
                    <dd className="mt-1 font-semibold">
                      {reasonLabels[report.reason] || report.reason}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 rounded-xl bg-red-500/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-300">
                    Relato
                  </p>

                  <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-zinc-300">
                    {report.details}
                  </p>
                </div>

                <p className="mt-4 text-xs text-zinc-600">
                  Enviada em {formatDate(report.created_at)}
                </p>

                <div className="mt-6">
                  <label
                    htmlFor={`resolution-${report.report_id}`}
                    className="mb-2 block text-sm font-semibold"
                  >
                    Observações da moderação
                  </label>

                  <textarea
                    id={`resolution-${report.report_id}`}
                    rows={3}
                    maxLength={2000}
                    value={
                      notes[report.report_id] ?? report.resolution_notes ?? ""
                    }
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [report.report_id]: event.target.value,
                      }))
                    }
                    placeholder="Registre a análise e as providências tomadas."
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {report.report_status === "pending" && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => updateReport(report, "reviewing")}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {updating ? "Atualizando..." : "Iniciar análise"}
                    </button>
                  )}

                  {!["resolved", "dismissed"].includes(
                    report.report_status,
                  ) && (
                    <>
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => updateReport(report, "resolved")}
                        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Marcar como resolvida
                      </button>

                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => updateReport(report, "dismissed")}
                        className="rounded-xl border border-zinc-500/30 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                      >
                        Rejeitar denúncia
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
