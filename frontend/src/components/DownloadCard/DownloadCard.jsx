import { RefreshCw, X, CheckCircle, AlertTriangle, Download, Loader } from 'lucide-react';
import BeatProgress from '../BeatProgress/BeatProgress';
import { getStreamUrl } from '../../services/api';
import './DownloadCard.css';

export default function DownloadCard({ job, onCancel, onRetry, onRemove }) {
  const { id, title, percent, speed, eta, status, error } = job;

  const isQueued = status === 'queued';
  const isPreparing = status === 'preparing';
  const isDownloading = status === 'downloading';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';

  const getStatusText = () => {
    if (isQueued) return 'Queued in line...';
    if (isPreparing) return 'Preparing media streams...';
    if (isDownloading) return 'Downloading...';
    if (isCompleted) return 'Completed';
    if (isFailed) return 'Failed';
    if (isCancelled) return 'Cancelled';
    return status;
  };

  return (
    <div className={`download-card ${status}`}>
      <div className="card-header">
        <h4 className="card-title" title={title}>{title}</h4>
        <div className="card-actions">
          {(isFailed || isCancelled || isCompleted) && (
            <button className="icon-btn" onClick={() => onRemove(id)} title="Dismiss">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="card-status-row">
        <span className="status-badge">
          {(isQueued || isPreparing) && <Loader size={12} className="spin-icon" />}
          {isCompleted && <CheckCircle size={12} className="success-icon" />}
          {(isFailed || isCancelled) && <AlertTriangle size={12} className="error-icon" />}
          {getStatusText()}
        </span>
        {isDownloading && <span className="speed-text">{speed}</span>}
      </div>

      {/* Progress Bar Area */}
      <div className="progress-section">
        <div className="progress-bar-container">
          <div 
            className={`progress-bar-fill ${status}`} 
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
        
        <div className="progress-details">
          <span>{percent}%</span>
          {isDownloading && <span>ETA: {eta}</span>}
        </div>
      </div>

      {/* Subtle equalizer wave animation */}
      {(isDownloading || isPreparing || isQueued) && (
        <BeatProgress status={status} />
      )}

      {/* Bottom control row */}
      <div className="card-footer-controls">
        {(isDownloading || isPreparing || isQueued) && (
          <button className="btn btn-secondary btn-sm" onClick={() => onCancel(id)}>
            <X size={14} /> Cancel
          </button>
        )}

        {(isFailed || isCancelled) && (
          <button className="btn btn-primary btn-sm" onClick={() => onRetry(id)}>
            <RefreshCw size={14} /> Retry
          </button>
        )}

        {isCompleted && (
          <a 
            href={getStreamUrl(id)} 
            className="btn btn-primary btn-sm btn-link" 
            download={title}
          >
            <Download size={14} /> Re-download
          </a>
        )}

        {isFailed && error && (
          <p className="error-message-text" title={error}>{error}</p>
        )}
      </div>
    </div>
  );
}
