export interface BillExtractionResult {
  vendorName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  billType: string;
  lineItems?: Array<{ description: string; amount: number }>;
  taxAmount?: number;
  notes?: string;
  confidenceScore?: number;
}

export interface DamageAnalysisResult {
  identifiedIssues: string[];
  severityLevel: 'emergency' | 'high' | 'medium' | 'low';
  recommendedTrade: string;
  estimatedRepairTime: string;
  estimatedCostRange?: string;
  suggestedPrecaution: string;
  triageSummary: string;
}

export async function analyzeBillPhoto(imageBase64: string, mimeType: string = "image/jpeg"): Promise<BillExtractionResult> {
  const res = await fetch('/api/gemini/analyze-bill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to analyze bill image');
  }
  return res.json();
}

export async function analyzeMaintenancePhoto(
  imageBase64: string, 
  prompt: string = '', 
  mimeType: string = "image/jpeg"
): Promise<DamageAnalysisResult> {
  const res = await fetch('/api/gemini/analyze-maintenance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, prompt, mimeType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to analyze maintenance photo');
  }
  return res.json();
}

export async function transcribeAudioVoice(audioBase64: string, mimeType: string = "audio/webm"): Promise<{ transcript: string }> {
  const res = await fetch('/api/gemini/transcribe-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to transcribe audio');
  }
  return res.json();
}

export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemInstruction?: string
): Promise<{ reply: string }> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemInstruction }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Chat request failed');
  }
  return res.json();
}

export async function generatePropertyImage(prompt: string, aspectRatio: string = "16:9"): Promise<{ imageUrl: string; description: string; aspectRatio: string }> {
  const res = await fetch('/api/gemini/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Image generation failed');
  }
  return res.json();
}

export async function quickTriageTicket(description: string): Promise<{ fastTriage: string }> {
  const res = await fetch('/api/gemini/quick-triage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Triage failed');
  }
  return res.json();
}

export async function searchRegulations(query: string): Promise<{ answer: string; groundingMetadata: any }> {
  const res = await fetch('/api/gemini/search-grounding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Search grounding failed');
  }
  return res.json();
}

export async function findNearbyServices(query: string): Promise<{ answer: string; groundingMetadata: any }> {
  const res = await fetch('/api/gemini/maps-grounding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Maps grounding failed');
  }
  return res.json();
}
