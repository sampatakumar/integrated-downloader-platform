import { useState, useRef } from 'react';
import { FileText, Clipboard, Play, Trash2, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { analyzeUrl } from '../../services/api';
import './BulkDownloader.css';

export default function BulkDownloader({ onQueueJobs }) {
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef(null);

  const handleTextChange = (e) => {
    setInputText(e.target.value);
  };

  // Helper to check standard provider patterns in frontend before hitting backend
  const isUrlSupported = (url) => {
    const lower = url.toLowerCase().trim();
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) return false;
    
    // Quick domain matches
    return (
      lower.includes('youtube.com/') ||
      lower.includes('youtu.be/') ||
      lower.includes('vimeo.com/') ||
      lower.includes('tiktok.com/') ||
      lower.includes('reddit.com/') ||
      lower.includes('instagram.com/') ||
      lower.includes('facebook.com/') ||
      lower.includes('fb.watch/') ||
      // Match direct extensions
      /\.(mp4|mp3|mkv|mov|avi|flv|webm|wav|flac|aac|m4a)(\?|$)/i.test(lower)
    );
  };

  // Import TXT or CSV files
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      let lines = [];
      
      if (file.name.endsWith('.csv')) {
        // Parse CSV by commas/newlines
        lines = content
          .split(/[\n,]+/)
          .map(line => line.trim())
          .filter(line => line.length > 0);
      } else {
        // Parse TXT by lines
        lines = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }

      // Add to text input
      const newText = lines.join('\n');
      setInputText(prev => prev ? prev + '\n' + newText : newText);
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  // Parse lines into items list
  const parseUrls = () => {
    const lines = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const items = lines.map((url, index) => {
      const supported = isUrlSupported(url);
      return {
        id: index,
        url,
        status: supported ? 'supported' : 'unsupported',
        title: supported ? 'Valid URL' : 'Unsupported media provider',
      };
    });

    setParsedItems(items);
  };

  // Analyze all URLs via backend validation
  const handleAnalyzeAll = async () => {
    const lines = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return;

    setIsValidating(true);
    const items = lines.map((url, index) => ({
      id: index,
      url,
      status: 'validating',
      title: 'Validating...',
      metadata: null
    }));
    setParsedItems(items);

    const updatedItems = [...items];

    for (let i = 0; i < lines.length; i++) {
      const url = lines[i];
      try {
        const metadata = await analyzeUrl(url);
        updatedItems[i] = {
          id: i,
          url,
          status: 'supported',
          title: metadata.title || 'Ready to download',
          metadata // Save parsed formats
        };
      } catch (err) {
        updatedItems[i] = {
          id: i,
          url,
          status: 'unsupported',
          title: err.message || 'Unsupported media link'
        };
      }
      // Trigger live UI updates per resolved item
      setParsedItems([...updatedItems]);
    }
    setIsValidating(false);
  };

  // Submit all supported URLs to queue
  const handleQueueAll = () => {
    const supportedJobs = parsedItems.filter(item => item.status === 'supported');
    if (supportedJobs.length === 0) return;

    supportedJobs.forEach(job => {
      // Pick original/first format by default in bulk mode
      const defaultFormat = job.metadata?.formats?.[0] || { format: 'mp4', quality: '720p', title: job.title };
      onQueueJobs({
        url: job.url,
        format: defaultFormat.format,
        quality: defaultFormat.quality,
        title: job.title
      });
    });

    // Reset fields
    setInputText('');
    setParsedItems([]);
  };

  const handleClear = () => {
    setInputText('');
    setParsedItems([]);
  };

  const supportedCount = parsedItems.filter(item => item.status === 'supported').length;
  const unsupportedCount = parsedItems.filter(item => item.status === 'unsupported').length;
  const validatingCount = parsedItems.filter(item => item.status === 'validating').length;

  return (
    <div className="bulk-downloader-card card">
      <h3 className="section-subtitle">Bulk Downloader</h3>
      <p className="section-desc">
        Download multiple links at once. Paste URLs below (one per line) or import a file.
      </p>

      <textarea
        className="input-field bulk-textarea"
        placeholder="https://youtube.com/watch?v=video1&#10;https://vimeo.com/video2&#10;https://instagram.com/p/media3"
        value={inputText}
        onChange={handleTextChange}
        disabled={isValidating}
      />

      <div className="bulk-controls">
        <input
          type="file"
          accept=".txt,.csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        
        <button 
          className="btn btn-secondary" 
          onClick={triggerFileSelect} 
          disabled={isValidating}
          title="Import from a TXT or CSV file"
        >
          <FileText size={16} /> Import File
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={handleAnalyzeAll} 
          disabled={isValidating || !inputText.trim()}
        >
          {isValidating ? <Loader size={16} className="spin" /> : <Clipboard size={16} />}
          Analyze All
        </button>

        <button 
          className="btn btn-primary" 
          onClick={handleQueueAll} 
          disabled={isValidating || supportedCount === 0}
        >
          <Play size={16} /> Start Downloads ({supportedCount})
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={handleClear} 
          disabled={isValidating || (!inputText && parsedItems.length === 0)}
        >
          <Trash2 size={16} /> Clear
        </button>
      </div>

      {/* Validation status overview */}
      {parsedItems.length > 0 && (
        <div className="bulk-report-section">
          <div className="report-summary">
            <span>{parsedItems.length} URLs detected:</span>
            <span className="count-tag supported">{supportedCount} supported</span>
            {unsupportedCount > 0 && (
              <span className="count-tag unsupported">{unsupportedCount} unsupported</span>
            )}
            {validatingCount > 0 && (
              <span className="count-tag validating">{validatingCount} checking</span>
            )}
          </div>

          <div className="report-list">
            {parsedItems.map((item) => (
              <div key={item.id} className={`report-item ${item.status}`}>
                {item.status === 'supported' && <CheckCircle2 size={14} className="success-icon" />}
                {item.status === 'unsupported' && <AlertCircle size={14} className="error-icon" />}
                {item.status === 'validating' && <Loader size={14} className="spin-icon" />}
                <span className="report-url" title={item.url}>{item.url}</span>
                <span className="report-status">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
