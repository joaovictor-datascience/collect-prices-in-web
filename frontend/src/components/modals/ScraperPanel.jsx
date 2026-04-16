import { useMemo } from 'react';
import {
  CircleX,
  RefreshCcw,
  TerminalSquare,
  X
} from 'lucide-react';

import { ModalPortal } from './ModalPortal';
import {
  buildLogGroups,
  formatDateTime,
  getJobSignalTone,
  getLogEventTone,
  getStatusMeta,
  renderGroupSummary,
  renderTrigger
} from '../../utils/scraperHelpers';

export function ScraperPanel({
  job,
  jobs,
  selectedJobId,
  logs,
  loadingLatest,
  loadingJob,
  loadingJobs,
  onRefresh,
  onSelectJob,
  open,
  onOpenChange
}) {
  const statusMeta = useMemo(() => getStatusMeta(job?.status), [job?.status]);
  const StatusIcon = statusMeta.icon;
  const logGroups = useMemo(() => buildLogGroups(logs), [logs]);

  if (!open) {
    return null;
  }

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={() => onOpenChange(false)}>
        <div
          className="modal-box modal-box--wide scraper-panel"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-scroll">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Worker</p>
                <h2>Execuções do scraper</h2>
                <p className="scraper-panel__subtitle">
                  Escolha um job específico e navegue pelos logs agrupados por produto.
                </p>
              </div>

              <div className="modal-header-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onRefresh}
                  disabled={loadingLatest || loadingJob || loadingJobs}
                >
                  <RefreshCcw size={16} />
                  Recarregar
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="scraper-panel-layout">
              <aside className="scraper-jobs-sidebar">
                <div className="scraper-jobs-sidebar__header">
                  <h3>Jobs recentes</h3>
                  <span>{jobs.length} item(ns)</span>
                </div>

                <div className="scraper-job-list">
                  {jobs.length ? (
                    jobs.map((jobItem) => {
                      const jobTone = getJobSignalTone(jobItem);
                      const jobStatusMeta = getStatusMeta(jobItem.status);

                      return (
                        <button
                          key={jobItem.id}
                          type="button"
                          className={`scraper-job-list-item ${String(jobItem.id) === String(selectedJobId) ? 'scraper-job-list-item--selected' : ''}`}
                          onClick={() => onSelectJob(jobItem.id)}
                        >
                          <div className="scraper-job-list-item__top">
                            <strong>Job #{jobItem.id}</strong>
                            <span className={`scraper-mini-pill scraper-mini-pill--${jobTone}`}>
                              {jobStatusMeta.label}
                            </span>
                          </div>
                          <div className="scraper-job-list-item__meta">
                            <span>{renderTrigger(jobItem.trigger_type)}</span>
                            <span>{formatDateTime(jobItem.requested_at)}</span>
                          </div>
                          <div className="scraper-job-list-item__stats">
                            <span>Falhas: {jobItem.summary.failed_urls}</span>
                            <span>Alertas: {jobItem.summary.unsupported_urls}</span>
                            <span>Sucessos: {jobItem.summary.successful_urls}</span>
                          </div>
                          <div className="scraper-job-list-item__meta">
                            <span>
                              Escopo:{' '}
                              {Array.isArray(jobItem.target_product_ids) && jobItem.target_product_ids.length
                                ? `${jobItem.target_product_ids.length} produto(s)`
                                : 'todos os ativos'}
                            </span>
                          </div>
                          {jobItem.error_message ? (
                            <div className="scraper-job-list-item__error">
                              <CircleX size={14} />
                              <span>{jobItem.error_message}</span>
                            </div>
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <div className="scraper-log-empty">
                      {loadingJobs ? 'Carregando jobs...' : 'Nenhuma execução encontrada ainda.'}
                    </div>
                  )}
                </div>
              </aside>

              <section className="scraper-job-content">
                {!job ? (
                  <div className="scraper-empty-state">
                    <TerminalSquare size={28} />
                    <div>
                      <h3>Nenhuma execução selecionada</h3>
                      <p>
                        O histórico vai aparecer aqui assim que um job manual ou agendado rodar pela
                        primeira vez.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="scraper-job-header">
                      <div className={`status-pill status-pill--${statusMeta.tone}`}>
                        <StatusIcon size={16} className={job.status === 'running' ? 'spin-icon' : ''} />
                        {statusMeta.label}
                      </div>
                      <div className="scraper-job-meta">
                        <span>Job #{job.id}</span>
                        <span>{renderTrigger(job.trigger_type)}</span>
                        <span>Solicitado em {formatDateTime(job.requested_at)}</span>
                      </div>
                    </div>

                    <div className="scraper-summary-grid">
                      <article className="scraper-summary-card">
                        <span>Produtos</span>
                        <strong>{job.summary.total_products}</strong>
                      </article>
                      <article className="scraper-summary-card">
                        <span>URLs</span>
                        <strong>{job.summary.total_urls}</strong>
                      </article>
                      <article className="scraper-summary-card">
                        <span>Sucesso</span>
                        <strong>{job.summary.successful_urls}</strong>
                      </article>
                      <article className="scraper-summary-card">
                        <span>Falhas</span>
                        <strong>{job.summary.failed_urls}</strong>
                      </article>
                      <article className="scraper-summary-card">
                        <span>Não suportadas</span>
                        <strong>{job.summary.unsupported_urls}</strong>
                      </article>
                      <article className="scraper-summary-card">
                        <span>Salvos</span>
                        <strong>{job.summary.saved_results}</strong>
                      </article>
                    </div>

                    <div className="scraper-timestamps">
                      <span>Iniciado: {formatDateTime(job.started_at)}</span>
                      <span>Finalizado: {formatDateTime(job.finished_at)}</span>
                    </div>

                    {job.error_message ? (
                      <div className="scraper-error-box">
                        <CircleX size={18} />
                        <span>{job.error_message}</span>
                      </div>
                    ) : null}

                    <div className="scraper-log-section">
                      <div className="scraper-log-header">
                        <h3>Logs agrupados por produto</h3>
                        <span>{logGroups.length} grupo(s)</span>
                      </div>

                      <div className="scraper-log-group-list">
                        {logGroups.length ? (
                          logGroups.map((group) => (
                            <details key={group.key} className={`scraper-log-group scraper-log-group--${group.tone}`}>
                              <summary className="scraper-log-group__summary">
                                <div>
                                  <strong>{group.label}</strong>
                                  <span>{renderGroupSummary(group)}</span>
                                </div>
                                <span>{group.logs.length} evento(s)</span>
                              </summary>

                              <div className="scraper-log-list scraper-log-list--grouped">
                                {group.logs.map((log) => (
                                  <article key={log.id} className={`scraper-log-item scraper-log-item--${getLogEventTone(log)}`}>
                                    <div className="scraper-log-item__header">
                                      <strong>{log.event_type}</strong>
                                      <span>{formatDateTime(log.created_at)}</span>
                                    </div>
                                    <p>{log.message}</p>
                                    <div className="scraper-log-item__meta">
                                      {log.store_name ? <span>Loja: {log.store_name}</span> : null}
                                      {log.url ? <span>{log.url}</span> : null}
                                    </div>
                                    {log.details && Object.keys(log.details).length ? (
                                      <details className="scraper-log-item__details">
                                        <summary>Detalhes</summary>
                                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                      </details>
                                    ) : null}
                                  </article>
                                ))}
                              </div>
                            </details>
                          ))
                        ) : (
                          <div className="scraper-log-empty">
                            {loadingLatest || loadingJob ? 'Carregando logs...' : 'Sem logs para esse job ainda.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
