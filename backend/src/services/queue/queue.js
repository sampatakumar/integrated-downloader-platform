import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getProvider } from '../../providers/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Jobs repository Map: jobId -> jobData
const jobs = new Map();
let activeCount = 0;

/**
 * Retrieves a job by ID.
 */
export function getJob(jobId) {
  return jobs.get(jobId);
}

/**
 * Creates and enqueues a new download job.
 * @returns {object} The created job object.
 */
export function createJob(url, format, quality, title) {
  const jobId = uuidv4();
  const job = {
    id: jobId,
    url,
    format,
    quality,
    title: title || 'Media Download',
    status: 'queued',
    percent: 0,
    speed: 'Waiting...',
    eta: '--:--',
    outputPath: null,
    error: null,
    childProcess: null,
    sseClients: [],
    createdAt: Date.now()
  };

  jobs.set(jobId, job);
  
  // Defer execution loop
  process.nextTick(processQueue);
  
  return job;
}

/**
 * Cancels a running or queued job.
 */
export function cancelJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return false;

  if (job.status === 'downloading' || job.status === 'preparing') {
    job.status = 'cancelled';
    job.speed = 'Cancelled';
    
    // Kill child download process if spawned
    if (job.childProcess) {
      try {
        job.childProcess.kill();
      } catch (err) {
        console.error(`[Queue] Error killing process for job ${jobId}:`, err);
      }
    }
    
    notifyProgress(jobId);
    cleanJobDirectory(jobId);
  } else if (job.status === 'queued') {
    job.status = 'cancelled';
    job.speed = 'Cancelled';
    notifyProgress(jobId);
  }
  
  return true;
}

/**
 * Retries a failed job.
 */
export function retryJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return false;

  if (job.status === 'failed' || job.status === 'cancelled') {
    job.status = 'queued';
    job.percent = 0;
    job.speed = 'Waiting...';
    job.eta = '--:--';
    job.error = null;
    job.outputPath = null;
    
    notifyProgress(jobId);
    process.nextTick(processQueue);
    return true;
  }
  return false;
}

/**
 * Registers an SSE client connection.
 */
export function addSseClient(jobId, res) {
  const job = jobs.get(jobId);
  if (!job) return false;

  job.sseClients.push(res);
  return true;
}

/**
 * Removes an SSE client connection.
 */
export function removeSseClient(jobId, res) {
  const job = jobs.get(jobId);
  if (!job) return;
  
  job.sseClients = job.sseClients.filter(client => client !== res);
}

/**
 * Broadcasts progress updates to all SSE subscribers of the job.
 */
function notifyProgress(jobId) {
  const job = jobs.get(jobId);
  if (!job || !job.sseClients) return;

  const payload = JSON.stringify({
    id: job.id,
    status: job.status,
    percent: job.percent,
    speed: job.speed,
    eta: job.eta,
    title: job.title,
    error: job.error
  });

  job.sseClients.forEach(res => {
    res.write(`data: ${payload}\n\n`);
  });
}

/**
 * Main queue runner.
 */
function processQueue() {
  const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_JOBS, 10) || 3;
  if (activeCount >= maxConcurrent) return;

  // Find next queued task
  const nextJob = Array.from(jobs.values()).find(j => j.status === 'queued');
  if (!nextJob) return;

  runJob(nextJob);
}

/**
 * Executes a single job.
 */
async function runJob(job) {
  activeCount++;
  job.status = 'downloading';
  job.percent = 0;
  job.speed = 'Connecting...';
  notifyProgress(job.id);

  const provider = getProvider(job.url);
  const tempDir = path.resolve(__dirname, '../../../temp', job.id);

  try {
    if (!provider) {
      throw new Error('Unsupported download source platform');
    }

    const filePath = await provider.download(
      job.url,
      job.format,
      job.quality,
      tempDir,
      {
        onSpawn: (child) => {
          job.childProcess = child;
        }
      },
      (progress) => {
        // Only update if not cancelled concurrently
        if (job.status === 'cancelled') return;
        
        job.percent = progress.percent;
        job.speed = progress.speed;
        job.eta = progress.eta;
        if (progress.status) {
          job.status = progress.status;
        }
        notifyProgress(job.id);
      }
    );

    if (job.status !== 'cancelled') {
      job.status = 'completed';
      job.percent = 100;
      job.speed = 'Completed';
      job.eta = '00:00';
      job.outputPath = filePath;
      job.childProcess = null;
      notifyProgress(job.id);
    }
  } catch (err) {
    if (job.status !== 'cancelled') {
      job.status = 'failed';
      job.error = err.message || 'Download task failed';
      job.childProcess = null;
      notifyProgress(job.id);
      console.error(`[Queue worker] Job ${job.id} exception:`, err);
    }
  } finally {
    activeCount--;
    process.nextTick(processQueue);
  }
}

/**
 * Cleans up temporary directory for a specific job.
 */
function cleanJobDirectory(jobId) {
  const dirPath = path.resolve(__dirname, '../../../temp', jobId);
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`[Queue] Successfully cleaned job folder: ${dirPath}`);
    } catch (err) {
      console.error(`[Queue] Error cleaning job folder ${dirPath}:`, err);
    }
  }
}
export default { createJob, getJob, cancelJob, retryJob, addSseClient, removeSseClient };

/**
 * Returns basic queue metrics for health checks.
 */
export function getQueueStats() {
  const total = jobs.size;
  let queued = 0, downloading = 0, completed = 0, failed = 0, cancelled = 0;
  for (const j of jobs.values()) {
    if (j.status === 'queued') queued++;
    else if (j.status === 'downloading') downloading++;
    else if (j.status === 'completed') completed++;
    else if (j.status === 'failed') failed++;
    else if (j.status === 'cancelled') cancelled++;
  }
  return { total, queued, downloading, completed, failed, cancelled, active: activeCount };
}
