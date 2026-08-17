import pkg from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import Provider from './base/Provider.js';

const { exec } = pkg;

/**
 * Shared Provider class utilizing yt-dlp.
 * Most external media sites share the exact same yt-dlp parsing and processing pipeline.
 */
class YtDlpProvider extends Provider {
  constructor(name, domains, sourceName) {
    super(name);
    this.domains = domains;
    this.sourceName = sourceName;
  }

  canHandle(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.domains.some(domain => hostname.includes(domain));
    } catch (err) {
      return false;
    }
  }

  async analyze(url) {
    try {
      // Fetch metadata from yt-dlp
      const options = {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        jsRuntimes: 'node',
        forceIpv4: true,
      };
      if (process.env.PROXY_URL) {
        options.proxy = process.env.PROXY_URL;
      }
      const info = await pkg(url, options);

      return {
        title: info.title || `${this.sourceName} Media`,
        uploader: info.uploader || info.channel || 'Unknown Creator',
        duration: info.duration || 0,
        thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails.length > 0 ? info.thumbnails[info.thumbnails.length - 1].url : null),
        source: this.sourceName,
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
      console.error(`[${this.sourceName} Analyze Error]`, err.stack || err.message);
      throw new Error(`Failed to analyze ${this.sourceName} media. Check that the link is public and accessible.`);
    }
  }

  async download(url, format, quality, outputDir, options = {}, onProgress = () => {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPattern = path.join(outputDir, 'media.%(ext)s');
        const flags = {
          output: outputPattern,
          noWarnings: true,
          noCheckCertificates: true,
          jsRuntimes: 'node',
          forceIpv4: true,
        };
        if (process.env.PROXY_URL) {
          flags.proxy = process.env.PROXY_URL;
        }

        if (format === 'mp3') {
          const kbps = quality.replace(/kbps|\s/g, '');
          flags.format = 'bestaudio/best';
          flags.extractAudio = true;
          flags.audioFormat = 'mp3';
          flags.audioQuality = `${kbps}k`;
        } else {
          const height = quality.replace('p', '');
          flags.format = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best`;
          flags.mergeOutputFormat = 'mp4';
        }

        console.log(`[${this.sourceName} Download] Spawning yt-dlp:`, flags);

        const child = exec(url, flags);

        if (options.onSpawn) {
          options.onSpawn(child);
        }

        child.stdout.on('data', (data) => {
          const text = data.toString();
          const match = text.match(/\[download\]\s+([\d.]+)%\s+of\s+([\d.]+\w+)\s+at\s+([\d.]+\w+\/s)\s+ETA\s+([\d:]+)/);
          if (match) {
            onProgress({
              percent: parseFloat(match[1]),
              speed: match[3],
              eta: match[4],
              status: 'downloading'
            });
          } else if (text.includes('[download] Destination:') || text.includes('[download] Resuming download')) {
            onProgress({ percent: 0, speed: 'Connecting...', eta: '--:--', status: 'downloading' });
          } else if (text.includes('[ExtractAudio]') || text.includes('[Merger]') || text.includes('[postprocess]')) {
            onProgress({ percent: 99, speed: 'Processing...', eta: 'Almost done', status: 'preparing' });
          }
        });

        child.stderr.on('data', (data) => {
          console.warn(`[${this.sourceName} Download stderr]`, data.toString());
        });

        child.on('close', (code) => {
          if (code === 0) {
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

export class VimeoProvider extends YtDlpProvider {
  constructor() {
    super('vimeo', ['vimeo.com'], 'Vimeo');
  }
}

export class TikTokProvider extends YtDlpProvider {
  constructor() {
    super('tiktok', ['tiktok.com'], 'TikTok');
  }
}

export class RedditProvider extends YtDlpProvider {
  constructor() {
    super('reddit', ['reddit.com'], 'Reddit');
  }
}

export class InstagramProvider extends YtDlpProvider {
  constructor() {
    super('instagram', ['instagram.com'], 'Instagram');
  }
}

export class FacebookProvider extends YtDlpProvider {
  constructor() {
    super('facebook', ['facebook.com', 'fb.watch'], 'Facebook');
  }
}
