import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import app from './app.js';
import { startCleanupWorker } from './services/cleanup/cleanup.js';

// Resolve directory paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv configuration (prioritizing backend/.env, falling back to root .env)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

global.ytDlpUpdateStatus = { status: 'pending' };

// Run yt-dlp update by direct download from official github release page
try {
  console.log('[MediaFlow Init] Updating yt-dlp binary directly to the latest version...');
  global.ytDlpUpdateStatus = { status: 'running', startedAt: new Date() };
  const isWindows = process.platform === 'win32';
  const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
  const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binaryName}`;
  const binaryDir = path.resolve(__dirname, '../node_modules/youtube-dl-exec/bin');
  const binaryPath = path.join(binaryDir, binaryName);

  if (!fs.existsSync(binaryDir)) {
    fs.mkdirSync(binaryDir, { recursive: true });
  }

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(binaryPath);
  await pipeline(Readable.fromWeb(response.body), fileStream);
  fs.chmodSync(binaryPath, 0o755);
  console.log('[MediaFlow Init] yt-dlp binary updated successfully.');
  global.ytDlpUpdateStatus = { status: 'success', completedAt: new Date(), path: binaryPath };
} catch (err) {
  console.error('[MediaFlow Init] Failed to update yt-dlp binary on boot:', err.message);
  global.ytDlpUpdateStatus = { status: 'failed', error: err.message, stack: err.stack, completedAt: new Date() };
}

// Inject static FFmpeg binary directory into the system PATH
const ffmpegDir = path.dirname(ffmpegInstaller.path);
process.env.PATH = `${ffmpegDir}${path.delimiter}${process.env.PATH}`;

console.log(`[MediaFlow Init] Embedded FFmpeg path configured: ${ffmpegInstaller.path}`);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[MediaFlow Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  // Start background file cleanup worker
  startCleanupWorker();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[MediaFlow Server] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[MediaFlow Server] Closed active connections.');
    process.exit(0);
  });
});
