import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

import { API_URL } from '../utils/api';

const ACTIVE_STATUSES = new Set(['pending', 'running']);
const POLL_INTERVAL_MS = 2500;
const JOB_LIST_LIMIT = 20;

function normalizeJobSummary(payload) {
  const { logs: _logs, ...jobSummary } = payload;
  return jobSummary;
}

function sortJobsByRequestedAt(jobs) {
  return [...jobs].sort((left, right) => {
    const leftTime = new Date(left.requested_at).getTime();
    const rightTime = new Date(right.requested_at).getTime();
    return rightTime - leftTime || right.id - left.id;
  });
}

export function useScraperJob({ open, setNotice }) {
  const [job, setJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [logs, setLogs] = useState([]);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [startingJob, setStartingJob] = useState(false);

  const lastLogIdRef = useRef(null);
  const pollingJobIdRef = useRef(null);

  function resetCurrentJob() {
    setJob(null);
    setLogs([]);
    setSelectedJobId('');
    lastLogIdRef.current = null;
  }

  function syncJobInList(jobSummary) {
    setJobs((current) => {
      const nextJobs = sortJobsByRequestedAt([
        jobSummary,
        ...current.filter((item) => item.id !== jobSummary.id)
      ]);
      return nextJobs.slice(0, JOB_LIST_LIMIT);
    });
  }

  function applySnapshot(payload, { append = false } = {}) {
    setSelectedJobId(String(payload.id));
    setJob(payload);
    syncJobInList(normalizeJobSummary(payload));
    setLogs((current) => {
      const nextLogs = append ? [...current, ...payload.logs] : payload.logs;
      lastLogIdRef.current = nextLogs.length ? nextLogs[nextLogs.length - 1].id : null;
      return nextLogs;
    });
    return payload;
  }

  async function loadJobs({ preferredJobId = null } = {}) {
    setLoadingJobs(true);
    try {
      const response = await axios.get(`${API_URL}/api/scraper/jobs`, {
        params: { limit: JOB_LIST_LIMIT }
      });

      const nextJobs = Array.isArray(response.data) ? response.data : [];
      setJobs(nextJobs);

      const resolvedSelectedJobId = (() => {
        const preferred = preferredJobId ? String(preferredJobId) : null;
        if (preferred && nextJobs.some((item) => String(item.id) === preferred)) {
          return preferred;
        }
        if (selectedJobId && nextJobs.some((item) => String(item.id) === String(selectedJobId))) {
          return String(selectedJobId);
        }
        return nextJobs[0] ? String(nextJobs[0].id) : '';
      })();

      setSelectedJobId(resolvedSelectedJobId);
      return resolvedSelectedJobId;
    } catch {
      setNotice({
        type: 'error',
        message: 'Não foi possível carregar a lista de execuções do scraper.'
      });
      return null;
    } finally {
      setLoadingJobs(false);
    }
  }

  async function loadJob(jobId, { append = false } = {}) {
    if (!jobId) {
      resetCurrentJob();
      return null;
    }

    setLoadingJob(true);
    try {
      const params = {};
      if (append && lastLogIdRef.current) {
        params.after_log_id = lastLogIdRef.current;
      }

      const response = await axios.get(`${API_URL}/api/scraper/jobs/${jobId}`, { params });
      return applySnapshot(response.data, { append });
    } finally {
      setLoadingJob(false);
    }
  }

  async function loadLatestJob() {
    setLoadingLatest(true);
    try {
      const nextSelectedJobId = await loadJobs();
      if (!nextSelectedJobId) {
        resetCurrentJob();
        return null;
      }

      return await loadJob(nextSelectedJobId);
    } catch (error) {
      if (error.response?.status === 404) {
        resetCurrentJob();
        setJobs([]);
        return null;
      }

      setNotice({
        type: 'error',
        message: 'Não foi possível carregar o histórico do scraper.'
      });
      return null;
    } finally {
      setLoadingLatest(false);
    }
  }

  async function refreshSelectedJob() {
    const nextSelectedJobId = await loadJobs({ preferredJobId: selectedJobId || job?.id });
    if (!nextSelectedJobId) {
      resetCurrentJob();
      return null;
    }

    lastLogIdRef.current = null;
    return loadJob(nextSelectedJobId);
  }

  async function selectJob(jobId) {
    if (!jobId) {
      resetCurrentJob();
      return null;
    }

    lastLogIdRef.current = null;
    setLogs([]);
    setSelectedJobId(String(jobId));
    return loadJob(jobId);
  }

  async function startJob({ productIds } = {}) {
    setStartingJob(true);
    try {
      const payload = {};
      if (Array.isArray(productIds) && productIds.length) {
        payload.product_ids = productIds;
      }

      const response = await axios.post(`${API_URL}/api/scraper/jobs`, payload);
      await loadJobs({ preferredJobId: response.data.job_id });
      await selectJob(response.data.job_id);
      setNotice({
        type: 'success',
        message: 'Execução do scraper iniciada.'
      });
      return true;
    } catch (error) {
      if (error.response?.status === 409 && error.response.data?.job_id) {
        await loadJobs({ preferredJobId: error.response.data.job_id });
        await selectJob(error.response.data.job_id);
        setNotice({
          type: 'info',
          message: 'Já existe uma execução ativa. Abrimos o job atual para acompanhamento.'
        });
        return false;
      }

      const message = error.response?.data?.error;
      setNotice({
        type: 'error',
        message: message || 'Não foi possível iniciar o scraper agora.'
      });
      return false;
    } finally {
      setStartingJob(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    loadLatestJob();
  }, [open]);

  useEffect(() => {
    pollingJobIdRef.current = job?.id ?? null;
  }, [job?.id]);

  useEffect(() => {
    const jobStatus = job?.status;
    if (!open || !pollingJobIdRef.current || !ACTIVE_STATUSES.has(jobStatus)) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const currentJobId = pollingJobIdRef.current;
      if (currentJobId) {
        loadJob(currentJobId, { append: true }).catch(() => {
          setNotice({
            type: 'error',
            message: 'Falha ao atualizar o status do scraper.'
          });
        });
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [job?.status, open]);

  const currentActiveJob = jobs.find((item) => ACTIVE_STATUSES.has(item.status))
    || (job && ACTIVE_STATUSES.has(job.status) ? job : null);

  return {
    job,
    jobs,
    selectedJobId,
    logs,
    loadingLatest,
    loadingJob,
    loadingJobs,
    startingJob,
    activeJob: Boolean(currentActiveJob),
    activeJobId: currentActiveJob?.id ?? null,
    loadLatestJob,
    refreshSelectedJob,
    selectJob,
    startJob
  };
}
