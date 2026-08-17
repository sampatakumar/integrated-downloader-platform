import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import app from './app.js';
import { startCleanupWorker } from './services/cleanup/cleanup.js';

// Resolve directory paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
