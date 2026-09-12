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
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  reviewing: "border-blue-200 bg-blue-50 text-blue-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  dismissed: "border-slate-200 bg-slate-50 text-slate-600",
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
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">
              Segurança da comunidade
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#071a4c]">
              Central de denúncias
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Analise relatos enviados pelos usuários e registre a decisão.
            </p>
          </div>

          <div className="w-full md:max-w-xs">
            <label
              htmlFor="report-status-filter"
              className="mb-2 block text-sm font-bold text-[#071a4c]"
            >
              Filtrar por situação
            </label>

            <select
              id="report-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
        <div
          role="status"
          className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      {filteredReports.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-blue-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600">
            ✓
          </div>

          <h3 className="mt-5 text-xl font-black text-[#071a4c]">
            Nenhuma denúncia encontrada
          </h3>

          <p className="mt-2 text-slate-600">
            Não existem denúncias correspondentes ao filtro selecionado.
          </p>
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
                className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"
              >
                <div className="border-b border-blue-100 bg-gradient-to-r from-red-50 via-white to-blue-50 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
                        {targetLabels[report.target_type] || report.target_type}
                      </p>

                      <h3 className="mt-2 break-words text-2xl font-black text-[#071a4c]">
                        {report.target_title}
                      </h3>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                        statusStyles[report.report_status] ||
                        statusStyles.pending
                      }`}
                    >
                      {statusLabels[report.report_status] ||
                        report.report_status}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <dt className="text-xs font-semibold text-slate-500">
                        Denunciante
                      </dt>
                      <dd className="mt-1 break-words font-bold text-[#071a4c]">
                        {reporterName}
                      </dd>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <dt className="text-xs font-semibold text-slate-500">
                        Denunciado
                      </dt>
                      <dd className="mt-1 break-words font-bold text-[#071a4c]">
                        {reportedName}
                      </dd>
                    </div>

                    <div className="col-span-2 rounded-xl bg-amber-50 p-4 md:col-span-1">
                      <dt className="text-xs font-semibold text-amber-700">
                        Motivo
                      </dt>
                      <dd className="mt-1 font-bold text-amber-900">
                        {reasonLabels[report.reason] || report.reason}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                      Relato
                    </p>

                    <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-700">
                      {report.details}
                    </p>
                  </div>

                  <p className="mt-4 text-xs font-medium text-slate-400">
                    Enviada em {formatDate(report.created_at)}
                  </p>

                  <div className="mt-6">
                    <label
                      htmlFor={`resolution-${report.report_id}`}
                      className="mb-2 block text-sm font-bold text-[#071a4c]"
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
                      className="w-full resize-none rounded-xl border border-blue-100 bg-white px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {report.report_status === "pending" && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => updateReport(report, "reviewing")}
                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Marcar como resolvida
                        </button>

                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => updateReport(report, "dismissed")}
                          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Rejeitar denúncia
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
