import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Trash2, CheckCircle2, Sliders, ShieldAlert } from 'lucide-react';
import { clearHistory } from '../../services/historyDB';
import './Settings.css';

export default function Settings() {
  // Load preferences from localStorage or default
  const [animationsOn, setAnimationsOn] = useState(() => {
    const val = localStorage.getItem('mf_animations');
    return val !== 'false';
  });

  const [historyEnabled, setHistoryEnabled] = useState(() => {
    const val = localStorage.getItem('mf_history_enabled');
    return val !== 'false';
  });

  const [downloadBehavior, setDownloadBehavior] = useState(() => {
    return localStorage.getItem('mf_download_behavior') || 'browser';
  });

  const [showClearSuccess, setShowClearSuccess] = useState(false);

  // Apply animation settings to DOM
  useEffect(() => {
    if (!animationsOn) {
      document.body.classList.add('disable-transitions');
    } else {
      document.body.classList.remove('disable-transitions');
    }
    localStorage.setItem('mf_animations', animationsOn.toString());
  }, [animationsOn]);

  useEffect(() => {
    localStorage.setItem('mf_history_enabled', historyEnabled.toString());
  }, [historyEnabled]);

  useEffect(() => {
    localStorage.setItem('mf_download_behavior', downloadBehavior);
  }, [downloadBehavior]);

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      setShowClearSuccess(true);
      setTimeout(() => setShowClearSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to clear database:', err);
    }
  };

  return (
    <div className="settings-page card">
      <div className="settings-header">
        <h2 className="page-title">Local Settings</h2>
        <p className="page-desc">
          Configure preferences saved locally inside your browser storage.
        </p>
      </div>

      <div className="settings-section">
        <h3 className="section-title-label">
          <Sliders size={16} /> User Interface
        </h3>
        
        <div className="setting-item-row">
          <div className="setting-details">
            <span className="setting-name">App Theme</span>
            <span className="setting-desc-text">Lock interface aesthetics to premium dark layout.</span>
          </div>
          <span className="setting-static-value">Dark Mode</span>
        </div>

        <div className="setting-item-row" onClick={() => setAnimationsOn(!animationsOn)}>
          <div className="setting-details">
            <span className="setting-name">Animations & Effects</span>
            <span className="setting-desc-text">Toggles ambient wave animations and tab slides.</span>
          </div>
          <button className="toggle-button">
            {animationsOn ? (
              <ToggleRight className="toggle-icon active" size={32} />
            ) : (
              <ToggleLeft className="toggle-icon" size={32} />
            )}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title-label">
          <ShieldAlert size={16} /> Privacy & Data
        </h3>

        <div className="setting-item-row" onClick={() => setHistoryEnabled(!historyEnabled)}>
          <div className="setting-details">
            <span className="setting-name">Enable Local History</span>
            <span className="setting-desc-text">Saves name + URL records to IndexedDB on completion.</span>
          </div>
          <button className="toggle-button">
            {historyEnabled ? (
              <ToggleRight className="toggle-icon active" size={32} />
            ) : (
              <ToggleLeft className="toggle-icon" size={32} />
            )}
          </button>
        </div>

        <div className="setting-item-row">
          <div className="setting-details">
            <span className="setting-name">Clear History Database</span>
            <span className="setting-desc-text">Permanently deletes all download history records.</span>
          </div>
          
          <div className="clear-database-group">
            {showClearSuccess && (
              <span className="clear-success-msg">
                <CheckCircle2 size={14} /> Cleared
              </span>
            )}
            <button className="btn btn-secondary clear-db-btn btn-sm" onClick={handleClearHistory}>
              <Trash2 size={14} /> Clear Now
            </button>
          </div>
        </div>
      </div>

      <div className="privacy-memo">
        <h4 className="memo-title">Accountless Privacy Promise</h4>
        <p className="memo-body">
          MediaFlow does not use server side registration databases, user profiles, download tracking quotas, or logs of your URLs. Your data is strictly your own.
        </p>
      </div>
    </div>
  );
}
