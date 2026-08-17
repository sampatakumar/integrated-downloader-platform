import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import app from './app.js';
import { startCleanupWorker } from './services/cleanup/cleanup.js';

import { execSync } from 'child_process';

// Resolve directory paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv configuration (prioritizing backend/.env, falling back to root .env)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Run youtube-dl-exec postinstall to pull the latest yt-dlp binary on boot
try {
  console.log('[MediaFlow Init] Updating yt-dlp binary to the latest version...');
  const postinstallPath = path.resolve(__dirname, '../node_modules/youtube-dl-exec/scripts/postinstall.js');
  execSync(`node "${postinstallPath}"`, { stdio: 'inherit' });
  console.log('[MediaFlow Init] yt-dlp binary updated successfully.');
} catch (err) {
  console.error('[MediaFlow Init] Failed to update yt-dlp binary on boot:', err.message);
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
