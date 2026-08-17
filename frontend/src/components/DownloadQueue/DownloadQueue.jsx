import { Play, Clipboard } from 'lucide-react';
import DownloadCard from '../DownloadCard/DownloadCard';
import './DownloadQueue.css';

export default function DownloadQueue({ jobs, onCancel, onRetry, onRemove }) {
  const activeJobs = jobs || [];

  return (
    <aside className="download-queue-panel card">
      <div className="queue-header">
        <h3 className="queue-title">ACTIVE QUEUE</h3>
        {activeJobs.length > 0 && (
          <span className="queue-count">{activeJobs.length} {activeJobs.length === 1 ? 'task' : 'tasks'}</span>
        )}
      </div>

      <div className="queue-list">
        {activeJobs.length === 0 ? (
          <div className="queue-empty-state">
            <div className="empty-icon-wrapper">
              <Clipboard className="empty-icon" size={32} />
            </div>
            <h4 className="empty-title">No active downloads</h4>
            <p className="empty-description">
              Paste a media link in the downloader to start processing.
            </p>
          </div>
        ) : (
          activeJobs.map((job) => (
            <DownloadCard
              key={job.id}
              job={job}
              onCancel={onCancel}
              onRetry={onRetry}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </aside>
  );
}
