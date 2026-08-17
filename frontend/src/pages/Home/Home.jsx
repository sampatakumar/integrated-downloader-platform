import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Globe, ArrowRight, CornerDownRight, Music, Film, AlertTriangle } from 'lucide-react';
import { analyzeUrl } from '../../services/api';
import BulkDownloader from '../../components/BulkDownloader/BulkDownloader';
import './Home.css';

export default function Home({ onQueueJob }) {
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Download selection states
  const [selectedFormatType, setSelectedFormatType] = useState('video'); // 'video' | 'audio'
  const [selectedQuality, setSelectedQuality] = useState('');

  // Auto-analyze URL when passed as a search parameter (from History page redirects)
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      const decodedUrl = decodeURIComponent(urlParam);
      setUrlInput(decodedUrl);
      autoAnalyzeUrl(decodedUrl);
      
      // Clear URL parameter from router address bar
      searchParams.delete('url');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrlInput(text);
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleClear = () => {
    setUrlInput('');
    setMetadata(null);
    setError(null);
  };

  const autoAnalyzeUrl = async (url) => {
    setIsAnalyzing(true);
    setError(null);
    setMetadata(null);

    try {
      const data = await analyzeUrl(url);
      setMetadata(data);
      
      // Set default selectors
      const defaultVideo = data.formats.find(f => f.type === 'video');
      if (defaultVideo) {
        setSelectedFormatType('video');
        setSelectedQuality(defaultVideo.quality);
      } else if (data.formats.length > 0) {
        setSelectedFormatType(data.formats[0].type);
        setSelectedQuality(data.formats[0].quality);
      }
    } catch (err) {
      setError(err.message || 'Failed to extract media information.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;
    await autoAnalyzeUrl(urlInput.trim());
  };

  const handleStartDownload = () => {
    if (!metadata) return;

    const matchedFormat = metadata.formats.find(
      f => f.type === selectedFormatType && f.quality === selectedQuality
    );

    if (!matchedFormat) return;

    onQueueJob({
      url: metadata.url,
      format: matchedFormat.format,
      quality: matchedFormat.quality,
      title: metadata.title
    });

    // Clear analysis state to reset input
    handleClear();
  };

  const formatDuration = (sec) => {
    if (!sec) return '00:00';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);

    const formattedMins = mins.toString().padStart(2, '0');
    const formattedSecs = secs.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${hrs}:${formattedMins}:${formattedSecs}`;
    }
    return `${formattedMins}:${formattedSecs}`;
  };

  // Filter formats based on selected type (video or audio)
  const availableQualities = metadata 
    ? metadata.formats.filter(f => f.type === selectedFormatType) 
    : [];

  return (
    <div className="home-page-container">
      <div className="hero-section">
        <h1 className="hero-title">Download the web, your way.</h1>
        <p className="hero-subtitle">
          A fast, private, and account-free media downloader. Paste a supported public link below.
        </p>
      </div>

      {/* Main Single Downloader */}
      <div className="downloader-card card">
        <form onSubmit={handleAnalyze} className="url-form">
          <div className="input-container">
            <Globe className="input-icon" size={20} />
            <input
              type="text"
              className="url-input"
              placeholder="Paste a supported media URL here..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={isAnalyzing}
            />
            {urlInput ? (
              <button type="button" className="input-clear-btn" onClick={handleClear}>
                Clear
              </button>
            ) : (
              <button type="button" className="input-paste-btn" onClick={handlePaste}>
                Paste
              </button>
            )}
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary analyze-btn" 
            disabled={isAnalyzing || !urlInput.trim()}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Error State */}
        {error && (
          <div className="error-alert">
            <AlertTriangle className="error-alert-icon" size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Analysis Results Metadata Card */}
        {metadata && (
          <div className="metadata-container">
            <div className="metadata-media-row">
              {metadata.thumbnail ? (
                <img 
                  src={metadata.thumbnail} 
                  alt="Video thumbnail" 
                  className="metadata-thumbnail" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="metadata-thumbnail-placeholder">
                  <Film size={32} />
                </div>
              )}
              
              <div className="metadata-details">
                <span className="metadata-source-badge">{metadata.source}</span>
                <h3 className="metadata-title">{metadata.title}</h3>
                <p className="metadata-meta">
                  <span>Channel: {metadata.uploader}</span>
                  {metadata.duration > 0 && (
                    <>
                      <span className="separator">•</span>
                      <span>Duration: {formatDuration(metadata.duration)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="download-configs">
              <div className="config-group">
                <label className="config-label">Media Type</label>
                <div className="type-toggle-buttons">
                  <button
                    className={`toggle-btn ${selectedFormatType === 'video' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedFormatType('video');
                      const firstVideo = metadata.formats.find(f => f.type === 'video');
                      if (firstVideo) setSelectedQuality(firstVideo.quality);
                    }}
                    disabled={!metadata.formats.some(f => f.type === 'video')}
                  >
                    <Film size={16} /> Video (MP4)
                  </button>
                  <button
                    className={`toggle-btn ${selectedFormatType === 'audio' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedFormatType('audio');
                      const firstAudio = metadata.formats.find(f => f.type === 'audio');
                      if (firstAudio) setSelectedQuality(firstAudio.quality);
                    }}
                    disabled={!metadata.formats.some(f => f.type === 'audio')}
                  >
                    <Music size={16} /> Audio (MP3)
                  </button>
                </div>
              </div>

              <div className="config-group">
                <label className="config-label">Preferred Quality</label>
                <select
                  className="input-field quality-selector"
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                >
                  {availableQualities.map((f) => (
                    <option key={f.quality} value={f.quality}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button className="btn btn-primary execute-download-btn" onClick={handleStartDownload}>
              <CornerDownRight size={18} /> Queue Download
            </button>
          </div>
        )}
      </div>

      {/* Bulk Downloader */}
      <BulkDownloader onQueueJobs={onQueueJob} />
    </div>
  );
}
