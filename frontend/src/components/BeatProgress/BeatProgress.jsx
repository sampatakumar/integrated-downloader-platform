import './BeatProgress.css';

/**
 * Renders a subtle, CSS-animated equalizer waveform that represents downloading activity.
 * @param {string} status - The current status of the download job.
 */
export default function BeatProgress({ status = 'downloading' }) {
  // Map job status to equalizer styling class
  let stateClass = 'downloading';
  if (status === 'queued') stateClass = 'preparing';
  if (status === 'preparing') stateClass = 'preparing';
  if (status === 'paused') stateClass = 'paused';
  if (status === 'completed') stateClass = 'completed';
  if (status === 'failed') stateClass = 'failed';
  if (status === 'cancelled') stateClass = 'failed';

  return (
    <div className={`beat-progress-container ${stateClass}`} aria-hidden="true">
      <div className="beat-bar bar-1"></div>
      <div className="beat-bar bar-2"></div>
      <div className="beat-bar bar-3"></div>
      <div className="beat-bar bar-4"></div>
      <div className="beat-bar bar-5"></div>
      <div className="beat-bar bar-6"></div>
      <div className="beat-bar bar-7"></div>
      <div className="beat-bar bar-8"></div>
      <div className="beat-bar bar-9"></div>
      <div className="beat-bar bar-10"></div>
      <div className="beat-bar bar-11"></div>
      <div className="beat-bar bar-12"></div>
    </div>
  );
}
