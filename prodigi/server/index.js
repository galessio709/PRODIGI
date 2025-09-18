import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

// GOOGLE AI STUDIO API 

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

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
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Errore durante la richiesta a Google AI.' });
  }
});

// ACCESS LOG HANDLING

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';

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
  if (!fs.existsSync(LOG_FILE)) return res.json([]);
  const logs = JSON.parse(fs.readFileSync(LOG_FILE));
  res.json(logs);
});

// server 

const PORT = 3000;
app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));