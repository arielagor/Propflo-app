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
  parsingStatus?: 'success' | 'partial' | 'failed';
  failureReason?: string;
  suggestions?: string[];
}

export interface DamageAnalysisResult {
  identifiedIssues: string[];
  severityLevel: 'emergency' | 'high' | 'medium' | 'low';
  recommendedTrade: string;
  estimatedRepairTime: string;
  estimatedCostRange?: string;
  suggestedPrecaution: string;
  triageSummary: string;
  parsingStatus?: 'success' | 'partial' | 'failed';
  failureReason?: string;
}

export async function analyzeBillPhoto(
  input: string | Array<{ data: string; mimeType?: string }>,
  mimeType: string = "image/jpeg"
): Promise<BillExtractionResult> {
  const payload = Array.isArray(input)
    ? { images: input.slice(0, 6) }
    : { imageBase64: input, mimeType };

  const res = await fetch('/api/gemini/analyze-bill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to analyze bill images');
  }
  return res.json();
}

export async function analyzeMaintenancePhoto(
  input: string | Array<{ data: string; mimeType?: string }>, 
  prompt: string = '', 
  mimeType: string = "image/jpeg"
): Promise<DamageAnalysisResult> {
  const payload = Array.isArray(input)
    ? { images: input.slice(0, 6), prompt }
    : { imageBase64: input, prompt, mimeType };

  const res = await fetch('/api/gemini/analyze-maintenance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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

export interface TroubleshootingApiResponse {
  safetyWarning?: string;
  probableCause: string;
  canRenterFix: boolean;
  urgency: 'emergency' | 'high' | 'medium' | 'low';
  recommendedTrade: string;
  steps: Array<{
    id: string;
    stepNumber: number;
    title: string;
    instruction: string;
    spokenInstruction: string;
    caution?: string;
  }>;
  estimatedFixTime?: string;
  recommendedTools?: string[];
  filingRecommendation?: string;
}

export async function requestMaintenanceTroubleshooting(
  input: string | Array<{ data: string; mimeType?: string }>,
  description: string,
  tradeHint?: string,
  mimeType: string = "image/jpeg"
): Promise<TroubleshootingApiResponse> {
  const payload = Array.isArray(input)
    ? { images: input.slice(0, 6), description, tradeHint }
    : { imageBase64: input, description, tradeHint, mimeType };

  const res = await fetch('/api/gemini/troubleshoot-maintenance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Troubleshooting request failed');
  }
  return res.json();
}
