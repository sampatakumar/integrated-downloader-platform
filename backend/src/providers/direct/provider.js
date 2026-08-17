import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import Provider from '../base/Provider.js';

/**
 * Direct file URL provider.
 * Handles direct links to media files (MP3, MP4, etc.) without scrapers.
 */
export class DirectProvider extends Provider {
  constructor() {
    super('direct');
  }

  canHandle(url) {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname.toLowerCase();
      // Match common media extensions
      return /\.(mp4|mp3|mkv|mov|avi|flv|webm|wav|flac|aac|m4a)$/i.test(pathname);
    } catch (err) {
      return false;
    }
  }

  async analyze(url) {
    try {
      const parsedUrl = new URL(url);
      const filename = path.basename(parsedUrl.pathname) || 'direct_media';
      const ext = path.extname(filename).substring(1).toLowerCase() || 'mp4';
      const isAudio = ['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext);

      // Perform a HEAD request to check headers and content length
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length'), 10) || 0;

      // Basic validation that it's a media source
      if (response.ok && contentType && !contentType.startsWith('video/') && !contentType.startsWith('audio/') && !contentType.startsWith('application/octet-stream')) {
        console.warn(`[DirectProvider] Warning: URL content-type is non-media: ${contentType}`);
      }

      const qualityLabel = isAudio ? 'Original Quality (Audio)' : 'Original Quality (Video)';
      const type = isAudio ? 'audio' : 'video';

      return {
        title: filename,
        uploader: parsedUrl.hostname,
        duration: 0, // Direct files don't expose duration in header
        thumbnail: null,
        source: 'Direct Link',
        url: url,
        formats: [
          { type, format: ext, quality: 'original', label: qualityLabel }
        ]
      };
    } catch (err) {
      console.error('[DirectProvider Analyze Error]', err.stack || err.message);
      throw new Error('Failed to reach target direct media file. Verify the URL is online and accessible.');
    }
  }

  async download(url, format, quality, outputDir, options = {}, onProgress = () => {}) {
    const abortController = new AbortController();
    
    // Wire cancellation trigger
    if (options.onSpawn) {
      options.onSpawn({
        kill: () => abortController.abort()
      });
    }

    return new Promise(async (resolve, reject) => {
      try {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`HTTP server returned code ${response.status}`);
        }

        const totalBytes = parseInt(response.headers.get('content-length'), 10) || 0;
        const filename = path.basename(new URL(url).pathname) || `media.${format}`;
        const outputPath = path.join(outputDir, filename);

        const fileStream = fs.createWriteStream(outputPath);
        const bodyStream = Readable.fromWeb(response.body);

        let downloadedBytes = 0;
        let lastUpdate = Date.now();
        let lastBytes = 0;

        bodyStream.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          
          // Emit progress every second
          if (now - lastUpdate > 1000) {
            const elapsedSec = (now - lastUpdate) / 1000;
            const speedBytesSec = (downloadedBytes - lastBytes) / elapsedSec;
            const speed = (speedBytesSec / (1024 * 1024)).toFixed(2) + ' MB/s';
            const percent = totalBytes ? parseFloat(((downloadedBytes / totalBytes) * 100).toFixed(1)) : 0;
            
            let eta = '--:--';
            if (totalBytes && speedBytesSec > 0) {
              const remainingBytes = totalBytes - downloadedBytes;
              const remainingSec = Math.round(remainingBytes / speedBytesSec);
              const minutes = Math.floor(remainingSec / 60);
              const seconds = remainingSec % 60;
              eta = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }

            onProgress({
              percent,
              speed,
              eta,
              status: 'downloading'
            });

            lastUpdate = now;
            lastBytes = downloadedBytes;
          }
        });

        // Write chunk to file
        bodyStream.pipe(fileStream);

        fileStream.on('finish', () => {
          onProgress({ percent: 100, speed: '0 MB/s', eta: '00:00', status: 'completed' });
          resolve(outputPath);
        });

        fileStream.on('error', (err) => {
          reject(err);
        });

        bodyStream.on('error', (err) => {
          reject(err);
        });

        abortController.signal.addEventListener('abort', () => {
          fileStream.close();
          // Clean up partial file
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          reject(new Error('Download cancelled by user.'));
        });

      } catch (err) {
        if (err.name === 'AbortError') {
          reject(new Error('Download cancelled by user.'));
        } else {
          reject(err);
        }
      }
    });
  }
}
export default DirectProvider;
