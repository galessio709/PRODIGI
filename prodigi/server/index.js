// ========================================
// IMPORTS AND ENVIRONMENT SETUP
// ========================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import { promisify } from 'util';
import lockfile from 'proper-lockfile';

// Load environment variables from .env file
dotenv.config();

// Verify required environment variables are set
if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY non configurata nel file .env');
}
if (!process.env.ADMIN_KEY) {
  throw new Error('ADMIN_KEY non configurata nel file .env');
}

// ========================================
// EXPRESS APP CONFIGURATION
// ========================================

const app = express();

// CRITICAL: Trust reverse proxy to get real user IPs
// This fixes the express-rate-limit error and enables per-user rate limiting
app.set('trust proxy', true);

// Define allowed origins for CORS
const allowedOrigins = [
  'https://play.unicam.it',
  'http://play.unicam.it',
  'http://localhost:4200',  // Angular default
  'http://127.0.0.1:4200',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

// Add production URL from environment variable if available
if (process.env.FRONTEND_URL) {
  try {
    const origin = new URL(process.env.FRONTEND_URL).origin;
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  } catch (error) {
    console.error('Invalid FRONTEND_URL in .env:', error.message);
  }
}

// Configure CORS to allow requests only from specified origins
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-admin-key']
}));

// Parse incoming JSON request bodies
app.use(express.json());

console.log('🔒 CORS enabled for origins:', allowedOrigins);

// ========================================
// REQUEST LOGGING MIDDLEWARE
// ========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REQUEST_LOG_FILE = path.join(__dirname, 'requestLogs.json');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Helper to append a single request log entry to file
async function appendRequestLog(logEntry) {
  let release;
  try {
    // Ensure the log file exists
    if (!fs.existsSync(REQUEST_LOG_FILE)) {
      await writeFile(REQUEST_LOG_FILE, JSON.stringify([], null, 2));
    }

    // Lock the file to prevent concurrent write issues
    release = await lockfile.lock(REQUEST_LOG_FILE, {
      retries: { 
        retries: 5, 
        minTimeout: 100,
        maxTimeout: 1000
      },
      stale: 10000
    });

    // Read existing logs
    const data = await readFile(REQUEST_LOG_FILE, 'utf8');
    const logs = JSON.parse(data);
    
    // Add new log entry
    logs.push(logEntry);
    
    // Keep only last 1000 requests to prevent file from growing too large
    const trimmedLogs = logs.slice(-1000);
    
    // Write back to file
    await writeFile(REQUEST_LOG_FILE, JSON.stringify(trimmedLogs, null, 2));
  } catch (err) {
    console.error('Error writing request log:', err);
  } finally {
    // Always release the lock
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('Error releasing lock:', releaseError);
      }
    }
  }
}

// Middleware: Log every incoming request and outgoing response
app.use(async (req, res, next) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Intercept res.json and res.status to capture response details
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);
  
  let statusCode = 200;
  let responseBody = null;
  
  // Override res.status to capture the status code
  res.status = function(code) {
    statusCode = code;
    return originalStatus(code);
  };
  
  // Override res.json to capture the response body
  res.json = function(body) {
    responseBody = body;
    return originalJson(body);
  };
  
  // When response finishes, log the complete request/response cycle
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    // Build the log entry with all relevant information
    const logEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip, // Real user IP (thanks to trust proxy setting)
      userAgent: req.get('user-agent'),
      origin: req.get('origin'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      // Only log message length for chat endpoint (privacy)
      requestBody: req.path === '/api/chat' ? { messageLength: req.body?.message?.length } : req.body,
      // Log full response only on errors (4xx, 5xx status codes)
      responseBody: statusCode >= 400 ? responseBody : { status: 'success' },
      headers: {
        'content-type': req.get('content-type'),
        'x-forwarded-for': req.get('x-forwarded-for') // Shows proxy chain
      }
    };
    
    // Print to console for immediate visibility
    console.log(`[${logEntry.timestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
    
    // Write to file asynchronously (non-blocking)
    appendRequestLog(logEntry);
  });
  
  next();
});

// ========================================
// GOOGLE AI CHAT ENDPOINT
// ========================================

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Rate limiter: 30 requests per 30 seconds per IP
const chatLimiter = rateLimit({
  windowMs: 30 * 1000,  // 30 second window
  max: 30,              // Max 30 requests per window
  message: { error: 'Troppe richieste, attendi un minuto' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/chat - Send a message to Google AI and get a response
app.post('/api/chat', chatLimiter, async (req, res) => {
  const { message } = req.body;

  // Validate message input
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Messaggio non valido' });
  }

  if (message.length > 10000) {
    return res.status(400).json({ error: 'Messaggio troppo lungo' });
  }

  try {
    // Call Google Gemini API
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${message}`
              }
            ]
          }
        ],
        // Safety settings to block harmful content
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
        ]
      },
      { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GOOGLE_API_KEY } }
    );

    // Extract AI response text
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Nessuna risposta.';
    res.json({ reply: text });
  } catch (error) {
    console.error('Google AI Error:', error.response?.data || error.message);

    // Handle rate limit errors from Google
    const statusCode = error.response?.status || 500;
    const errorMessage = statusCode === 429
      ? 'Troppe richieste, riprova tra poco'
      : 'Errore durante la richiesta. Riprova.';

    res.status(statusCode).json({ error: errorMessage });
  }
});

// ========================================
// USER ACCESS LOG ENDPOINTS
// ========================================

const ADMIN_KEY = process.env.ADMIN_KEY;
const LOG_FILE = path.join(__dirname, 'accessLogs.json');

// Helper: Read user access logs from file
async function readLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      await writeFile(LOG_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = await readFile(LOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading logs:', err);
    return [];
  }
}

// Helper: Write user access logs to file
async function writeLogs(logs) {
  await writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
}

// POST /api/logAccess - Log when a user accesses the application
app.post('/api/logAccess', async (req, res) => {
  let release;
  try {
    // Ensure directory exists
    const dir = dirname(LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Ensure file exists
    if (!fs.existsSync(LOG_FILE)) {
      await writeFile(LOG_FILE, JSON.stringify([], null, 2));
    }

    // Lock file to prevent concurrent write conflicts
    release = await lockfile.lock(LOG_FILE, {
      retries: { 
        retries: 5, 
        minTimeout: 100,
        maxTimeout: 1000
      },
      stale: 10000 // Consider lock stale after 10 seconds
    });

    // Create log entry
    const logEntry = {
      name: req.body.name || 'anonimo',
      deviceId: req.body.deviceId || 'unknown',
      date: new Date().toISOString()
    };

    // Read current logs, add new entry, and save
    const logs = await readLogs();
    logs.push(logEntry);
    await writeLogs(logs);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging access:', error);
    res.status(500).json({ 
      error: 'Errore nel salvare il log',
      details: error.message 
    });
  } finally {
    // Always release the file lock
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('Error releasing lock:', releaseError);
      }
    }
  }
});

// GET /api/getLogs - Retrieve all user access logs (admin only)
app.get('/api/getLogs', async (req, res) => {
  const providedKey = req.headers['x-admin-key'];

  // Check admin authentication
  if (providedKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Accesso negato: chiave admin non valida' });
  }

  try {
    const logs = await readLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ 
      error: 'Errore nel leggere i log',
      details: error.message 
    });
  }
});

// ========================================
// START SERVER
// ========================================

const PORT = 3000;
app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));