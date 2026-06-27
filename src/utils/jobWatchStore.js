const WATCH_KEY = 'mecal_job_watch_enabled';

export function isJobWatchEnabled() {
  try {
    return localStorage.getItem(WATCH_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setJobWatchEnabled(enabled) {
  localStorage.setItem(WATCH_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('mecal:job-watch-changed', { detail: enabled }));
}
