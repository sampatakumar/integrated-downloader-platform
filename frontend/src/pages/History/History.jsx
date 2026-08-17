import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, ArrowRight, CornerDownRight, Trash, Globe } from 'lucide-react';
import { getHistory, deleteHistoryItem, clearHistory } from '../../services/historyDB';
import './History.css';

export default function History() {
  const [historyItems, setHistoryItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const navigate = useNavigate();

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      // Reverse to show newest first
      setHistoryItems(data.reverse());
    } catch (err) {
      console.error('Failed to load IndexedDB history:', err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteHistoryItem(id);
      await loadHistory();
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearHistory();
      setHistoryItems([]);
      setShowConfirmClear(false);
    } catch (err) {
      console.error('Failed to clear history database:', err);
    }
  };

  const handleReimport = (url) => {
    // Navigate home, appending URL as a search parameter to trigger auto-analysis
    navigate(`/?url=${encodeURIComponent(url)}`);
  };

  // Derive supported platforms labels from URL hosts
  const getPlatformFromUrl = (urlString) => {
    try {
      const hostname = new URL(urlString).hostname.toLowerCase();
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube';
      if (hostname.includes('instagram.com')) return 'Instagram';
      if (hostname.includes('tiktok.com')) return 'TikTok';
      if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) return 'Facebook';
      if (hostname.includes('reddit.com')) return 'Reddit';
      if (hostname.includes('vimeo.com')) return 'Vimeo';
      return 'Direct Media';
    } catch (e) {
      return 'Direct Media';
    }
  };

  // Filter list by title or URL matching search query
  const filteredItems = historyItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="history-page card">
      <div className="history-header">
        <div>
          <h2 className="page-title">Local History</h2>
          <p className="page-desc">
            Your personal downloads history database. Stored strictly in your browser.
          </p>
        </div>
        {historyItems.length > 0 && (
          <button className="btn btn-secondary clear-btn" onClick={() => setShowConfirmClear(true)}>
            <Trash size={16} /> Clear All
          </button>
        )}
      </div>

      {/* Confirmation Dialog Popover/Modal */}
      {showConfirmClear && (
        <div className="modal-backdrop glass">
          <div className="confirm-modal card">
            <h3 className="confirm-title">Clear Download History?</h3>
            <p className="confirm-desc">
              Are you sure you want to clear your local database? This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirmClear(false)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-danger" onClick={handleClearAll}>
                Clear Database
              </button>
            </div>
          </div>
        </div>
      )}

      {historyItems.length > 0 && (
        <div className="search-bar-container">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="input-field search-input"
            placeholder="Search local downloads history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* History List */}
      <div className="history-list-container">
        {historyItems.length === 0 ? (
          <div className="empty-history">
            <div className="history-empty-icon-wrapper">
              <Globe size={36} />
            </div>
            <h3>No downloads yet</h3>
            <p>Your local download history logs will appear here.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-history">
            <h3>No matching logs</h3>
            <p>No history item matches your search query "{searchQuery}".</p>
          </div>
        ) : (
          <div className="history-items-grid">
            {filteredItems.map((item) => (
              <div key={item.id} className="history-item-row" onClick={() => handleReimport(item.url)}>
                <div className="item-details">
                  <span className="item-platform-badge">{getPlatformFromUrl(item.url)}</span>
                  <h4 className="item-title">{item.name}</h4>
                  <span className="item-url-text" title={item.url}>{item.url}</span>
                </div>
                
                <div className="item-row-actions">
                  <button 
                    className="btn btn-secondary reimport-btn btn-sm" 
                    onClick={() => handleReimport(item.url)}
                    title="Reload URL in downloader"
                  >
                    Load <CornerDownRight size={12} />
                  </button>
                  
                  <button 
                    className="icon-btn delete-btn" 
                    onClick={(e) => handleDelete(item.id, e)}
                    title="Delete record"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
