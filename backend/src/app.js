import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mediaRoutes from './routes/mediaRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
// Allow multiple origins via CORS_ORIGINS (comma-separated) or single FRONTEND_URL for backwards compatibility
const originsEnv = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = originsEnv.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Always allow localhost and 127.0.0.1 loopback requests on any port
    try {
      const hostname = new URL(origin).hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return callback(null, true);
      }
    } catch (e) {
      // Ignored
    }

    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting to prevent brute-force/abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Register API Routes
app.use('/api', mediaRoutes);

// Serve Temp Files for direct downloading if necessary (fallback streaming is preferred, but route handles it)
app.use('/temp', express.static(path.resolve(__dirname, '../temp')));

// Serve static frontend files in production/standalone local mode
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  // Handle client-side routing fallback for Single Page App
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/temp')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err.stack || err.message);
  
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected server error occurred.' 
    : err.message;
    
  res.status(status).json({ error: message });
});

export default app;
