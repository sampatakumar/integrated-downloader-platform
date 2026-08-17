import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Starts a background interval worker to remove abandoned temporary files.
 * Cleans folders older than 30 minutes in the /temp/ directory.
 */
export function startCleanupWorker() {
  const tempRootDir = path.resolve(__dirname, '../../../temp');

  // Guarantee that the root temp directory exists
  if (!fs.existsSync(tempRootDir)) {
    fs.mkdirSync(tempRootDir, { recursive: true });
  }

  const intervalMs = 10 * 60 * 1000; // 10 minutes
  const maxAgeMs = 30 * 60 * 1000;  // 30 minutes

  setInterval(() => {
    console.log('[Cleanup Worker] Beginning temporary files scan...');
    try {
      const items = fs.readdirSync(tempRootDir);
      const now = Date.now();

      items.forEach(item => {
        const itemPath = path.join(tempRootDir, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          const age = now - stats.mtimeMs;
          if (age > maxAgeMs) {
            console.log(`[Cleanup Worker] Removing abandoned download directory: ${item}`);
            fs.rmSync(itemPath, { recursive: true, force: true });
          }
        }
      });
    } catch (err) {
      console.error('[Cleanup Worker] Scan failed:', err.message);
    }
  }, intervalMs);
}
export default startCleanupWorker;
