import type { IncomingMessage, ServerResponse } from 'http';
import {
  analyzeBillImage,
  analyzeMaintenanceDamage,
  transcribeMaintenanceAudio,
  quickTriage,
  chatAssistant,
  generatePropertyImage,
  searchPropertyRegulations,
  findNearbyVendorsOrProperties
} from './geminiService';

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Safeguard against extremely large payloads (>25MB)
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', err => reject(err));
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/gemini/')) {
    return false; // Not handled by this router
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return true;
  }

  try {
    const body = await parseJsonBody(req);

    if (url === '/api/gemini/analyze-bill') {
      const { imageBase64, mimeType } = body;
      if (!imageBase64) {
        sendJson(res, 400, { error: 'Missing imageBase64' });
        return true;
      }
      const result = await analyzeBillImage(imageBase64, mimeType);
      sendJson(res, 200, result);
      return true;
    }

    if (url === '/api/gemini/analyze-maintenance') {
      const { imageBase64, prompt, mimeType } = body;
      if (!imageBase64) {
        sendJson(res, 400, { error: 'Missing imageBase64' });
        return true;
      }
      const result = await analyzeMaintenanceDamage(imageBase64, prompt, mimeType);
      sendJson(res, 200, result);
      return true;
    }

    if (url === '/api/gemini/transcribe-audio') {
      const { audioBase64, mimeType } = body;
      if (!audioBase64) {
        sendJson(res, 400, { error: 'Missing audioBase64' });
        return true;
      }
      const result = await transcribeMaintenanceAudio(audioBase64, mimeType);
      sendJson(res, 200, result);
      return true;
    }

    if (url === '/api/gemini/quick-triage') {
      const { description } = body;
      const result = await quickTriage(description || '');
      sendJson(res, 200, result);
      return true;
    }

    if (url === '/api/gemini/chat') {
      const { messages, systemInstruction } = body;
      if (!messages || !Array.isArray(messages)) {
        sendJson(res, 400, { error: 'Missing messages array' });
        return true;
      }
      const result = await chatAssistant(messages, systemInstruction);
      sendJson(res, 200, result);
      return true;
    }

    if (url === '/api/gemini/generate-image') {
      const { prompt, aspectRatio } = body;
      if (!prompt) {
        sendJson(res, 400, { error: 'Missing prompt' });
        return true;
      }
      const result = await generatePropertyImage(prompt, aspectRatio);
      sendJson(res, 200, result);
      return true;
    }

    if (url === '/api/gemini/search-grounding') {
      const { query } = body;
      if (!query) {
        sendJson(res, 400, { error: 'Missing query' });
        return true;
      }
      const result = await searchPropertyRegulations(query);
      sendJson(res, 200, result);
      return true;
    }

    if (url === '/api/gemini/maps-grounding') {
      const { query } = body;
      if (!query) {
        sendJson(res, 400, { error: 'Missing query' });
        return true;
      }
      const result = await findNearbyVendorsOrProperties(query);
      sendJson(res, 200, result);
      return true;
    }

    sendJson(res, 404, { error: 'Endpoint not found' });
    return true;
  } catch (err: any) {
    console.error('API Error in handler:', err);
    sendJson(res, 500, { error: err.message || 'Internal Server Error' });
    return true;
  }
}
