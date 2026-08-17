import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ssrfProtection from '../middleware/ssrf.js';
import { getProvider, getSupportedProviders } from '../providers/registry.js';
import {
  createJob,
  getJob,
  cancelJob,
  retryJob,
  addSseClient,
  removeSseClient,
  getQueueStats
} from '../services/queue/queue.js';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const router = express.Router();

// Health endpoint with diagnostics
router.get('/health', (req, res) => {
  try {
    const tempRoot = path.resolve(__dirname, '../../../temp');
    let tempStats = { exists: false, files: 0, sizeBytes: 0 };
    if (fs.existsSync(tempRoot)) {
      tempStats.exists = true;
      const stack = [tempRoot];
      while (stack.length) {
        const cur = stack.pop();
        const entries = fs.readdirSync(cur);
        for (const e of entries) {
          const full = path.join(cur, e);
          try {
            const st = fs.statSync(full);
            if (st.isDirectory()) stack.push(full);
            else if (st.isFile()) {
              tempStats.files += 1;
              tempStats.sizeBytes += st.size;
            }
          } catch (err) {
            // ignore individual file errors
          }
        }
      }
    }

    const queue = getQueueStats();
    const providers = getSupportedProviders();

    const payload = {
      status: 'OK',
      timestamp: new Date(),
      uptimeSeconds: process.uptime(),
      node: process.version,
      platform: os.platform(),
      memory: process.memoryUsage(),
      ffmpeg: {
        path: ffmpegInstaller.path || null,
        exists: fs.existsSync(ffmpegInstaller.path)
      },
      temp: tempStats,
      queue,
      providers: { count: providers.length }
    };

    res.status(200).json(payload);
  } catch (err) {
    console.error('[Health] Error while gathering health info:', err);
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// List supported providers
router.get('/providers', (req, res) => {
  res.status(200).json(getSupportedProviders());
});

// Analyze URL for media info
router.post('/media/analyze', ssrfProtection, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL query parameter is required' });
  }

  const provider = getProvider(url);
  if (!provider) {
    return res.status(400).json({
      error: 'Unsupported media URL. Paste a link from a supported platform.'
    });
  }

  try {
    const metadata = await provider.analyze(url);
    res.status(200).json(metadata);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// Create download job
router.post('/downloads', ssrfProtection, async (req, res) => {
  const { url, format, quality, title } = req.body;
  if (!url || !format || !quality) {
    return res.status(400).json({ error: 'URL, format, and quality are required parameters' });
  }

  const provider = getProvider(url);
  if (!provider) {
    return res.status(400).json({ error: 'Unsupported media URL' });
  }

  try {
    const job = createJob(url, format, quality, title);
    res.status(201).json({ jobId: job.id, message: 'Job successfully queued' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue download task' });
  }
});

// SSE progress subscriber
router.get('/downloads/:jobId/progress', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    // Disable buffering in reverse proxies like Nginx
    'X-Accel-Buffering': 'no'
  });

  // Write initial state
  const payload = JSON.stringify({
    id: job.id,
    status: job.status,
    percent: job.percent,
    speed: job.speed,
    eta: job.eta,
    title: job.title,
    error: job.error
  });
  res.write(`data: ${payload}\n\n`);

  addSseClient(jobId, res);

  req.on('close', () => {
    removeSseClient(jobId, res);
  });
});

// Cancel active/queued job
router.post('/downloads/:jobId/cancel', (req, res) => {
  const { jobId } = req.params;
  const success = cancelJob(jobId);
  if (success) {
    res.status(200).json({ message: 'Job successfully cancelled' });
  } else {
    res.status(404).json({ error: 'Job not found or cannot be cancelled' });
  }
});

// Retry failed/cancelled job
router.post('/downloads/:jobId/retry', (req, res) => {
  const { jobId } = req.params;
  const success = retryJob(jobId);
  if (success) {
    res.status(200).json({ message: 'Job successfully retried' });
  } else {
    res.status(404).json({ error: 'Job not found or cannot be retried' });
  }
});

// Stream final output file to client
router.get('/downloads/:jobId/stream', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status !== 'completed' || !job.outputPath || !fs.existsSync(job.outputPath)) {
    return res.status(400).json({ error: 'File is not ready or has been cleaned' });
  }

  const ext = path.extname(job.outputPath).substring(1).toLowerCase();
  
  // Sanitize original title to form a safe, readable filename
  let safeTitle = job.title
    .replace(/[\\/:*?"<>|]/g, '-') // Replace characters forbidden in Windows/Linux filesystems
    .replace(/\s+/g, ' ')          // Collapse duplicate whitespace
    .trim();
  if (!safeTitle) safeTitle = 'media';
  if (safeTitle.length > 200) safeTitle = safeTitle.substring(0, 200);
  const safeFilename = `${safeTitle}.${ext}`;

  // Set MIME type
  let contentType = 'application/octet-stream';
  if (ext === 'mp3') contentType = 'audio/mpeg';
  if (ext === 'mp4') contentType = 'video/mp4';

  const stats = fs.statSync(job.outputPath);

  // Set HTTP download stream headers preserving original UTF-8 characters and spaces
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stats.size,
    'Content-Disposition': `attachment; filename="${safeFilename.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
  });

  const readStream = fs.createReadStream(job.outputPath);
  readStream.pipe(res);

  readStream.on('error', (err) => {
    console.error(`[Stream] Error streaming file for job ${jobId}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Streaming error occurred' });
    }
  });

  // Crucial: Delete local files upon successful delivery
  res.on('finish', () => {
    const jobDir = path.dirname(job.outputPath);
    console.log(`[Stream] Transfer finished. Cleaning up temporary folders: ${jobDir}`);
    try {
      fs.rmSync(jobDir, { recursive: true, force: true });
    } catch (err) {
      console.error(`[Stream Cleanup Error] Failed to delete job dir ${jobDir}:`, err.message);
    }
  });
});

export default router;
