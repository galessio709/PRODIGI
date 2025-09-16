import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
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

const PORT = 3000;
app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));
