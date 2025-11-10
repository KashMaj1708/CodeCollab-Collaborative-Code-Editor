import { Router, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const LANGUAGE_ID_MAP: { [key: string]: number } = {
  javascript: 93, // (Node.js 18.15.0)
  typescript: 94, // (TypeScript 5.0.3)
  python: 92,     // (Python 3.11.2)
  java: 91,       // (OpenJDK 17.0.6)
  go: 95,         // (Go 1.16)
  html: 8,        // Not executable
  css: 9,         // Not executable
};

// --- FIX: Helper function to decode base64 ---
// (We use Buffer, which is the standard Node.js way)
const decodeBase64 = (base64: string | null): string | null => {
  if (!base64) return null;
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (e) {
    console.error('Failed to decode base64 string:', e);
    return null;
  }
};

// POST /api/execute
router.post('/', async (req: Request, res: Response) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: 'Language and code are required.' });
  }

  const languageId = LANGUAGE_ID_MAP[language];
  if (!languageId) {
    return res.status(400).json({ error: `Language '${language}' is not supported.` });
  }

  const options = {
    method: 'POST',
    url: `https://${process.env.RAPIDAPI_HOST}/submissions`,
    params: {
      // --- FIX: Tell Judge0 to send base64 ---
      base64_encoded: 'true',
      wait: 'true' // Wait for the execution result
    },
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
    },
    data: {
      language_id: languageId,
      source_code: Buffer.from(code, 'utf-8').toString('base64'),
    }
  };

  try {
    const response = await axios.request(options);
    const { stdout, stderr, compile_output, message, status } = response.data;
    
    console.log(`[Judge0] Executed ${language}. Status: ${status.description}`);
    
    // --- FIX: Use our new decoding function ---
    res.json({
      stdout: decodeBase64(stdout),
      stderr: decodeBase64(stderr),
      compile_output: decodeBase64(compile_output),
      message: decodeBase64(message),
      status: status,
    });

  } catch (error: any) {
    console.error('Error calling Judge0:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to execute code', details: error.response?.data });
  }
});

export default router;