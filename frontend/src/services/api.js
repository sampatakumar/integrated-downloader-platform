const envBase = typeof import.meta.env.VITE_API_BASE === 'string' ? import.meta.env.VITE_API_BASE : 'http://localhost:5000';
const API_BASE = envBase ? (envBase.replace(/\/$/, '') + '/api') : '/api';

/**
 * Helper to standardise HTTP error handling.
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errMsg = 'Network request failed';
    try {
      const data = await response.json();
      errMsg = data.error || errMsg;
    } catch (e) {
      // Ignored: fallback to generic msg
    }
    throw new Error(errMsg);
  }
  return response.json();
}

/**
 * Fetch list of active providers.
 */
export async function getSupportedProviders() {
  const response = await fetch(`${API_BASE}/providers`);
  return handleResponse(response);
}

/**
 * Post a media URL for extraction analysis.
 */
export async function analyzeUrl(url) {
  const response = await fetch(`${API_BASE}/media/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return handleResponse(response);
}

/**
 * Queue a new media download.
 */
export async function createDownloadJob(url, format, quality, title) {
  const response = await fetch(`${API_BASE}/downloads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format, quality, title })
  });
  return handleResponse(response);
}

/**
 * Cancel an active download task.
 */
export async function cancelDownloadJob(jobId) {
  const response = await fetch(`${API_BASE}/downloads/${jobId}/cancel`, {
    method: 'POST'
  });
  return handleResponse(response);
}

/**
 * Retry a failed or cancelled task.
 */
export async function retryDownloadJob(jobId) {
  const response = await fetch(`${API_BASE}/downloads/${jobId}/retry`, {
    method: 'POST'
  });
  return handleResponse(response);
}

/**
 * Gets the direct file stream download route.
 */
export function getStreamUrl(jobId) {
  return `${API_BASE}/downloads/${jobId}/stream`;
}

export function getProgressUrl(jobId) {
  return `${API_BASE}/downloads/${jobId}/progress`;
}
