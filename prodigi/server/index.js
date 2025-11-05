import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
//import { promisify } from 'util';
//import lockfile from 'proper-lockfile';

// GOOGLE AI STUDIO API 

dotenv.config();
if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY non configurata nel file .env');
}
if (!process.env.ADMIN_KEY) {
  throw new Error('ADMIN_KEY non configurata nel file .env');
}
const app = express();
app.use(cors());
app.use(express.json());

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


// endpoint per salvare un log di accesso
app.post('/logAccess', (req, res) => {
  const logEntry = {
    name: req.body.name || 'anonimo',
    deviceId: req.body.deviceId || 'unknown',
    date: new Date().toISOString()
  };

  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    logs = JSON.parse(fs.readFileSync(LOG_FILE));
  }

  logs.push(logEntry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

  res.status(200).json({ success: true });
});

// endpoint per leggere i log (solo admin)
app.get('/getLogs', (req, res) => {
  const providedKey = req.headers['x-admin-key'];

  if (providedKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Accesso negato: chiave admin non valida' });
  }

  if (!fs.existsSync(LOG_FILE)) return res.json([]);
  const logs = JSON.parse(fs.readFileSync(LOG_FILE));
  res.json(logs);
});

// server 

const PORT = 3000;
app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));