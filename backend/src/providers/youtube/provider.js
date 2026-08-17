import pkg from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import Provider from '../base/Provider.js';

const { exec } = pkg;

/**
 * YouTube media provider.
 * Interacts with yt-dlp to extract details and download/convert media.
 */
export class YouTubeProvider extends Provider {
  constructor() {
    super('youtube');
  }

  canHandle(url) {
    const lower = url.toLowerCase();
    return lower.includes('youtube.com/') || lower.includes('youtu.be/');
  }

  async analyze(url) {
    try {
      // Execute yt-dlp to retrieve video info
      const info = await pkg(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        jsRuntimes: 'node',
        extractorArgs: 'youtube:player_client=web_embedded,web,tv',
        forceIpv4: true,
      });

      return {
        title: info.title || 'YouTube Video',
        uploader: info.uploader || info.channel || 'Unknown Creator',
        duration: info.duration || 0,
        thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails.length > 0 ? info.thumbnails[info.thumbnails.length - 1].url : null),
        source: 'YouTube',
        url: url,
        formats: [
          { type: 'video', format: 'mp4', quality: '1080p', label: 'MP4 (1080p)' },
          { type: 'video', format: 'mp4', quality: '720p', label: 'MP4 (720p)' },
          { type: 'video', format: 'mp4', quality: '480p', label: 'MP4 (480p)' },
          { type: 'video', format: 'mp4', quality: '360p', label: 'MP4 (360p)' },
          { type: 'audio', format: 'mp3', quality: '320 kbps', label: 'MP3 (320 kbps)' },
          { type: 'audio', format: 'mp3', quality: '256 kbps', label: 'MP3 (256 kbps)' },
          { type: 'audio', format: 'mp3', quality: '128 kbps', label: 'MP3 (128 kbps)' }
        ]
      };
    } catch (err) {
      console.error('[YouTubeProvider Analyze Error]', err.stack || err.message);
      throw new Error('Failed to analyze YouTube metadata. Verify the URL is public and valid.');
    }
  }

  async download(url, format, quality, outputDir, options = {}, onProgress = () => {}) {
    return new Promise((resolve, reject) => {
      try {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Generate a temporary unique filename pattern
        const outputPattern = path.join(outputDir, 'media.%(ext)s');

        const flags = {
          output: outputPattern,
          noWarnings: true,
          noCheckCertificates: true,
          jsRuntimes: 'node',
          extractorArgs: 'youtube:player_client=web_embedded,web,tv',
          forceIpv4: true,
        };

        if (format === 'mp3') {
          const kbps = quality.replace(/kbps|\s/g, '');
          flags.format = 'bestaudio/best';
          flags.extractAudio = true;
          flags.audioFormat = 'mp3';
          flags.audioQuality = `${kbps}k`;
        } else {
          // MP4 / Video
          const height = quality.replace('p', '');
          flags.format = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best`;
          flags.mergeOutputFormat = 'mp4';
        }

        console.log(`[YouTubeProvider] Spawning download process:`, flags);

        const child = exec(url, flags);

        // Store child process reference to support cancellation
        if (options.onSpawn) {
          options.onSpawn(child);
        }

        child.stdout.on('data', (data) => {
          const text = data.toString();
          // Regex to match yt-dlp progress print:
          // [download]  12.3% of 45.67MiB at  3.45MiB/s ETA 00:05
          const match = text.match(/\[download\]\s+([\d.]+)%\s+of\s+([\d.]+\w+)\s+at\s+([\d.]+\w+\/s)\s+ETA\s+([\d:]+)/);
          if (match) {
            const percent = parseFloat(match[1]);
            const speed = match[3];
            const eta = match[4];

            onProgress({
              percent,
              speed,
              eta,
              status: 'downloading'
            });
          } else if (text.includes('[download] Destination:') || text.includes('[download] Resuming download')) {
            onProgress({ percent: 0, speed: 'Connecting...', eta: '--:--', status: 'downloading' });
          } else if (text.includes('[ExtractAudio]') || text.includes('[Merger]') || text.includes('[postprocess]')) {
            onProgress({ percent: 99, speed: 'Processing...', eta: 'Almost done', status: 'preparing' });
          }
        });

        child.stderr.on('data', (data) => {
          const text = data.toString();
          console.warn(`[YouTubeProvider stderr]`, text);
        });

        child.on('close', (code) => {
          if (code === 0) {
            // Find the created file in outputDir (mp4 or mp3)
            const files = fs.readdirSync(outputDir);
            const downloadFile = files.find(f => !f.startsWith('.') && (f.endsWith('.mp4') || f.endsWith('.mp3')));
            if (downloadFile) {
              resolve(path.join(outputDir, downloadFile));
            } else {
              reject(new Error('Downloaded file not found in output directory.'));
            }
          } else {
            reject(new Error(`yt-dlp download failed with exit code ${code}`));
          }
        });

        child.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}
export default YouTubeProvider;
