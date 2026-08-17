import { getStreamUrl } from './api.js';
import { addHistoryItem } from './historyDB.js';

/**
 * Initiates an EventSource (SSE) stream to track real-time progress of a download job.
 * On success, triggers the browser's download prompt and logs the item in local history.
 * 
 * @param {string} jobId - The job UUID.
 * @param {string} originalUrl - The source URL to write to IndexedDB on completion.
 * @param {function} onUpdate - Callback handling progress packets.
 * @param {function} onError - Callback handling network/SSE errors.
 * @returns {function} Cleanup function to unsubscribe.
 */
export function subscribeToProgress(jobId, originalUrl, onUpdate, onError) {
  const eventSource = new EventSource(`http://localhost:5000/api/downloads/${jobId}/progress`);

  eventSource.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate(data);

      if (data.status === 'completed') {
        eventSource.close();
        
        // Trigger browser stream download
        triggerBrowserDownload(jobId, data.title);
        
        // Add strictly name + url to IndexedDB
        try {
          await addHistoryItem(data.title, originalUrl);
        } catch (dbErr) {
          console.error('[DownloadService] Failed to write history:', dbErr);
        }
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        eventSource.close();
      }
    } catch (err) {
      console.error('[DownloadService] Message processing exception:', err);
    }
  };

  eventSource.onerror = (err) => {
    eventSource.close();
    if (onError) onError(err);
  };

  // Return unsubscribe cleanup hook
  return () => {
    eventSource.close();
  };
}

/**
 * Triggers browser-native file download using a temporary anchor element.
 */
export function triggerBrowserDownload(jobId, filename) {
  const downloadUrl = getStreamUrl(jobId);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename || 'media_download');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
