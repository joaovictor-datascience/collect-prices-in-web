import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  Clock3,
  LoaderCircle
} from 'lucide-react';

const SUCCESS_EVENT_TYPES = new Set(['url_succeeded', 'result_saved', 'job_completed']);
const WARNING_EVENT_TYPES = new Set(['url_unsupported', 'url_no_result', 'job_completed_with_errors']);
const ERROR_EVENT_TYPES = new Set(['url_failed', 'job_failed']);

export function formatDateTime(value) {
  if (!value) {
    return 'Ainda não';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(parsed);
}

export function getStatusMeta(status) {
  switch (status) {
    case 'completed':
      return { label: 'Concluído', tone: 'success', icon: CheckCircle2 };
    case 'completed_with_errors':
      return { label: 'Concluído com alertas', tone: 'warning', icon: AlertTriangle };
    case 'failed':
      return { label: 'Falhou', tone: 'danger', icon: CircleX };
    case 'running':
      return { label: 'Executando', tone: 'info', icon: LoaderCircle };
    case 'pending':
      return { label: 'Na fila', tone: 'info', icon: Clock3 };
    default:
      return { label: status || 'Sem status', tone: 'muted', icon: Clock3 };
  }
}

export function renderTrigger(triggerType) {
  return triggerType === 'scheduled' ? 'Agendado' : 'Manual';
}

export function getLogEventTone(log) {
  if (log.level === 'error' || ERROR_EVENT_TYPES.has(log.event_type)) {
    return 'danger';
  }
  if (log.level === 'warning' || WARNING_EVENT_TYPES.has(log.event_type)) {
    return 'warning';
  }
  if (SUCCESS_EVENT_TYPES.has(log.event_type)) {
    return 'success';
  }
  return 'info';
}

export function getJobSignalTone(jobItem) {
  if (jobItem.status === 'failed' || jobItem.error_message || jobItem.summary.failed_urls > 0) {
    return 'danger';
  }
  if (jobItem.status === 'completed_with_errors' || jobItem.summary.unsupported_urls > 0) {
    return 'warning';
  }
  if (jobItem.status === 'completed' || jobItem.summary.successful_urls > 0) {
    return 'success';
  }
  return 'info';
}

export function buildLogGroups(logs) {
  const groups = new Map();

  for (const log of logs) {
    const groupKey = log.product_name || '__job__';
    const groupLabel = log.product_name || 'Execução';
    const existing = groups.get(groupKey) || {
      key: groupKey,
      label: groupLabel,
      tone: 'info',
      errorCount: 0,
      warningCount: 0,
      successCount: 0,
      logs: []
    };

    const eventTone = getLogEventTone(log);
    if (eventTone === 'danger') {
      existing.errorCount += 1;
    } else if (eventTone === 'warning') {
      existing.warningCount += 1;
    } else if (eventTone === 'success') {
      existing.successCount += 1;
    }

    existing.logs.push(log);
    existing.tone = existing.errorCount > 0
      ? 'danger'
      : existing.warningCount > 0
        ? 'warning'
        : existing.successCount > 0
          ? 'success'
          : 'info';

    groups.set(groupKey, existing);
  }

  return [...groups.values()].sort((left, right) => {
    if (left.key === '__job__') {
      return -1;
    }
    if (right.key === '__job__') {
      return 1;
    }

    const weight = { danger: 0, warning: 1, success: 2, info: 3 };
    return weight[left.tone] - weight[right.tone] || left.label.localeCompare(right.label, 'pt-BR');
  });
}

export function renderGroupSummary(group) {
  const parts = [];

  if (group.errorCount) {
    parts.push(`${group.errorCount} erro(s)`);
  }
  if (group.warningCount) {
    parts.push(`${group.warningCount} alerta(s)`);
  }
  if (group.successCount) {
    parts.push(`${group.successCount} sucesso(s)`);
  }

  return parts.length ? parts.join(' • ') : `${group.logs.length} evento(s)`;
}
