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

// GOOGLE AI STUDIO API 

dotenv.config();
if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY non configurata nel file .env');
}
if (!process.env.ADMIN_KEY) {
  throw new Error('ADMIN_KEY non configurata nel file .env');
}

const app = express();

const allowedOrigins = [
  'https://play.unicam.it',
  'http://play.unicam.it',
  'http://localhost:4200',  // Angular default
  'http://127.0.0.1:4200',
  'http://localhost:3000',  // If you're using port 3000
  'http://127.0.0.1:3000'
];

// Add production URL from .env if available
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

app.use(express.json());

console.log('🔒 CORS enabled for origins:', allowedOrigins);

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const chatLimiter = rateLimit({
  windowMs: 30 * 1000,  // 1 minute
  max: 30,              // Google's free tier: 60 requests/minute
  message: { error: 'Troppe richieste, attendi un minuto' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Messaggio non valido' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: 'Messaggio troppo lungo' });
  }

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Rispondi in modo semplice e adatto a bambini/ragazzi. 
                L'utente ha scritto: ${message}`
              }
            ]
          }
        ],
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
        ]
      },
      { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GOOGLE_API_KEY } }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Nessuna risposta.';
    res.json({ reply: text });
  } catch (error) {
    console.error('Google AI Error:', error.response?.data || error.message);

    const statusCode = error.response?.status || 500;
    const errorMessage = statusCode === 429
      ? 'Troppe richieste, riprova tra poco'
      : 'Errore durante la richiesta. Riprova.';

    res.status(statusCode).json({ error: errorMessage });
  }
});

// ACCESS LOG HANDLING

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ADMIN_KEY = process.env.ADMIN_KEY;  // la chiave viene dal .env
// file JSON per salvare i log accessi
const LOG_FILE = path.join(__dirname, 'accessLogs.json');

// Helper function to safely read logs
async function readLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      // Create empty file if it doesn't exist
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

// Helper function to safely write logs
async function writeLogs(logs) {
  await writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
}

// endpoint per salvare un log di accesso
app.post('/api/logAccess', async (req, res) => {
  let release;
  try {
    // Ensure directory exists
    const dir = dirname(LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Ensure file exists before trying to lock it
    if (!fs.existsSync(LOG_FILE)) {
      await writeFile(LOG_FILE, JSON.stringify([], null, 2));
    }

    // Acquire lock before reading/writing
    release = await lockfile.lock(LOG_FILE, {
      retries: { 
        retries: 5, 
        minTimeout: 100,
        maxTimeout: 1000
      },
      stale: 10000 // Consider lock stale after 10 seconds
    });

    const logEntry = {
      name: req.body.name || 'anonimo',
      deviceId: req.body.deviceId || 'unknown',
      date: new Date().toISOString()
    };

    // Read current logs
    const logs = await readLogs();
    
    // Add new entry
    logs.push(logEntry);
    
    // Write back to file
    await writeLogs(logs);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging access:', error);
    res.status(500).json({ 
      error: 'Errore nel salvare il log',
      details: error.message 
    });
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
});

// endpoint per leggere i log (solo admin)
app.get('/api/getLogs', async (req, res) => {
  const providedKey = req.headers['x-admin-key'];

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

// server 

const PORT = 3000;
app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));