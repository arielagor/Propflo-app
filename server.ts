import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { handleApiRequest } from './src/server/apiHandler.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// API routes handled by the API router
app.use(async (req, res, next) => {
  if (req.url.startsWith('/api/gemini/')) {
    const handled = await handleApiRequest(req, res);
    if (handled) return;
  }
  next();
});

// Serve static assets from dist in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PropFlow Enterprise server listening on 0.0.0.0:${PORT}`);
});
