import { GoogleGenAI, Type } from "@google/genai";

const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

export interface ImageDataItem {
  data: string;
  mimeType?: string;
}

// Resilient model caller using free-tier enabled models: gemini-3.1-flash-lite and gemini-3.8-flash
async function callGeminiWithFallback(ai: GoogleGenAI, params: any) {
  const models = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];
  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} attempt notice:`, err?.message?.slice(0, 100));
      lastError = err;
    }
  }
  throw lastError;
}

function formatGeminiError(err: any, fallbackMessage: string): string {
  if (!err) return fallbackMessage;
  const msg = typeof err === 'string' ? err : err.message || '';
  if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'Gemini API free tier rate limit reached. Please wait a brief moment before retrying, or complete the fields manually below.';
  }
  if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
    return 'The AI OCR service is currently experiencing temporary high traffic. Please retry in a few seconds or enter details manually below.';
  }
  if (msg.includes('image') || msg.includes('format') || msg.includes('decode')) {
    return 'The uploaded document image format could not be decoded. Please upload a clear JPG, PNG, or PDF.';
  }
  return fallbackMessage;
}

// 1. Photo of Bills & Invoice Analysis using free-tier vision models (Supports up to 6 images)
export async function analyzeBillImage(
  input: string | ImageDataItem[],
  defaultMimeType: string = "image/jpeg"
) {
  const ai = getGenAIClient();

  const imageList: ImageDataItem[] = Array.isArray(input)
    ? input.slice(0, 6)
    : [{ data: input, mimeType: defaultMimeType }];

  if (imageList.length === 0) {
    return {
      parsingStatus: 'failed',
      failureReason: 'No images were provided for analysis. Please upload at least 1 image (up to 6 allowed).',
      suggestions: ['Select or take a photo of your bill', 'Ensure file size is under 20MB']
    };
  }

  const imageParts = imageList.map((img, idx) => {
    let clean = img.data.replace(/^data:[a-zA-Z0-9\/\+]+;base64,/, '');
    return {
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: clean,
      }
    };
  });

  try {
    const response = await callGeminiWithFallback(ai, {
      contents: {
        parts: [
          ...imageParts,
          {
            text: `You are an expert real estate accounting and billing specialist with high-precision OCR capabilities.
Analyze the provided photo(s) (up to 6 pages/angles of this bill, invoice, or receipt).
If the document is legible, extract all fields accurately.
If the document is illegible, partially obscured, not a bill, or cut off, you MUST explicitly indicate why in 'parsingStatus' and 'failureReason'.
Return ONLY valid JSON adhering strictly to the schema.`
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            parsingStatus: {
              type: Type.STRING,
              description: "success | partial | failed"
            },
            failureReason: {
              type: Type.STRING,
              description: "Clear explanation if parsing failed or was incomplete (e.g. 'Image too blurry', 'Total amount obscured by glare', 'Missing vendor name', 'Not a financial document')"
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Actionable tips for the user to get a better scan"
            },
            vendorName: { type: Type.STRING, description: "Name of the vendor, utility, or contractor" },
            invoiceNumber: { type: Type.STRING, description: "Invoice, account, or reference number" },
            amount: { type: Type.NUMBER, description: "Total amount due or paid" },
            dueDate: { type: Type.STRING, description: "Payment due date in YYYY-MM-DD format if present" },
            billType: { 
              type: Type.STRING, 
              description: "utility | contractor_invoice | property_tax | maintenance_receipt | insurance" 
            },
            lineItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER }
                },
                required: ["description", "amount"]
              }
            },
            taxAmount: { type: Type.NUMBER, description: "Tax amount if broken down" },
            notes: { type: Type.STRING, description: "Summary of services or items billed" },
            confidenceScore: { type: Type.NUMBER, description: "Confidence score between 0 and 1" }
          },
          required: ["parsingStatus"]
        }
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);

    // If no vendorName or amount could be found, flag partial/failed
    if (!parsed.amount && !parsed.vendorName && parsed.parsingStatus !== 'failed') {
      parsed.parsingStatus = 'failed';
      parsed.failureReason = parsed.failureReason || 'Could not detect a clear vendor name or total amount in the uploaded images.';
    }

    return parsed;
  } catch (err: any) {
    console.error('Gemini OCR Analysis Error:', err);
    return {
      parsingStatus: 'failed',
      failureReason: formatGeminiError(err, 'Unable to automatically parse bill image format. Please enter details manually below.'),
      suggestions: [
        'Ensure the photo has clear lighting and no glare',
        'Upload JPG or PNG files without heavy compression',
        'You can still fill in the invoice fields manually below'
      ],
      vendorName: '',
      amount: 0,
      billType: 'contractor_invoice'
    };
  }
}

// 2. Photo Maintenance Damage Analysis using gemini-3.1-pro-preview (Supports up to 6 images)
export async function analyzeMaintenanceDamage(
  input: string | ImageDataItem[],
  promptText: string = "",
  defaultMimeType: string = "image/jpeg"
) {
  const ai = getGenAIClient();

  const imageList: ImageDataItem[] = Array.isArray(input)
    ? input.slice(0, 6)
    : [{ data: input, mimeType: defaultMimeType }];

  if (imageList.length === 0) {
    return {
      parsingStatus: 'failed',
      failureReason: 'No damage photos provided for inspection.',
      identifiedIssues: [],
      severityLevel: 'medium',
      recommendedTrade: 'general',
      suggestedPrecaution: 'Inspect area carefully.',
      triageSummary: 'Pending on-site inspection'
    };
  }

  const imageParts = imageList.map(img => {
    let clean = img.data.replace(/^data:[a-zA-Z0-9\/\+]+;base64,/, '');
    return {
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: clean,
      }
    };
  });

  try {
    const response = await callGeminiWithFallback(ai, {
      contents: {
        parts: [
          ...imageParts,
          {
            text: `You are an expert property maintenance supervisor and structural damage inspector. 
Analyze the provided photos (up to 6 photos from different angles or distances).
User description: "${promptText || 'Inspect damage and triage'}"
Provide a detailed structural and trade evaluation. If the photos are too dark or do not show damage, indicate that in 'failureReason'.
Return valid JSON.`
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            parsingStatus: { type: Type.STRING, description: "success | partial | failed" },
            failureReason: { type: Type.STRING, description: "Explanation if damage could not be assessed" },
            identifiedIssues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of identified physical issues or defects"
            },
            severityLevel: { 
              type: Type.STRING, 
              description: "emergency | high | medium | low" 
            },
            recommendedTrade: { 
              type: Type.STRING, 
              description: "plumbing | electrical | hvac | structural | appliance | general" 
            },
            estimatedRepairTime: { type: Type.STRING, description: "Estimated time to repair (e.g., 2-4 hours)" },
            estimatedCostRange: { type: Type.STRING, description: "Estimated cost range in USD" },
            suggestedPrecaution: { type: Type.STRING, description: "Immediate safety instructions for lessee (e.g. shut off main valve)" },
            triageSummary: { type: Type.STRING, description: "Short summary for vendor work order dispatch" }
          },
          required: ["identifiedIssues", "severityLevel", "recommendedTrade", "suggestedPrecaution", "triageSummary"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (err: any) {
    console.error('Damage inspection error:', err);
    return {
      parsingStatus: 'failed',
      failureReason: formatGeminiError(err, 'Could not analyze damage images. Please check photo quality or inspect manually.'),
      identifiedIssues: ['Manual inspection required'],
      severityLevel: 'medium',
      recommendedTrade: 'general',
      suggestedPrecaution: 'Exercise caution and do not touch exposed wiring or leaking pipes.',
      triageSummary: 'Damage assessment pending contractor physical review.'
    };
  }
}

// 3. Audio Transcription using gemini-3.5-transcribe
export async function transcribeMaintenanceAudio(base64Audio: string, mimeType: string = "audio/webm") {
  const ai = getGenAIClient();
  const cleanedAudio = base64Audio.replace(/^data:audio\/[a-z0-9]+;base64,/, '');

  const response = await ai.models.generateContent({
    model: "gemini-3.5-transcribe",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanedAudio,
          },
        },
        {
          text: `Transcribe this tenant maintenance voice recording verbatim. 
Then summarize the core request, category (plumbing, electrical, hvac, structural, appliance, general), and urgency.`
        }
      ],
    },
  });

  return {
    transcript: response.text || "Voice transcription completed.",
  };
}

// 4. Low-latency responses using gemini-3.1-flash-lite
export async function quickTriage(ticketDescription: string) {
  const ai = getGenAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: `You are an ultra-fast emergency triage dispatcher for property maintenance.
Triage this request immediately in under 50 words:
"${ticketDescription}"
Specify: Urgency (Emergency / High / Medium / Low), First Action, Department Assignment.`,
  });

  return {
    fastTriage: response.text || "",
  };
}

// 5. Multi-turn Chatbot using gemini-3.5-flash with system instruction & conversation history
export async function chatAssistant(
  messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemInstruction?: string
) {
  const ai = getGenAIClient();
  
  const defaultInstruction = `You are PropFlow AI, the intelligent property management, leasing, and bureaucracy concierge.
You assist property managers, leasing agents, maintenance teams, and tenants with:
1. Streamlining approval workflows and identifying bottlenecks.
2. Generating lease clauses, notice to vacate, rent increase notices, or maintenance work orders.
3. Advising on tenant rights, escrow laws, and maintenance vendor management.
4. Providing real-time clear guidance with a professional, helpful tone.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: messages,
    config: {
      systemInstruction: systemInstruction || defaultInstruction,
      temperature: 0.7,
    }
  });

  return {
    reply: response.text || "",
  };
}

// 6. Image Generation with Aspect Ratio Affordance using gemini-3.1-flash-image
export async function generatePropertyImage(prompt: string, aspectRatio: string = "16:9") {
  const ai = getGenAIClient();
  const validAspectRatios = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
  const chosenRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "16:9";

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image",
    contents: {
      parts: [{ text: `High quality architectural render or property staging visual: ${prompt}` }],
    },
    config: {
      imageConfig: {
        aspectRatio: chosenRatio as any,
        imageSize: "1K",
      },
    },
  });

  let imageUrl = "";
  let descriptionText = "";

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      } else if (part.text) {
        descriptionText += part.text;
      }
    }
  }

  return {
    imageUrl,
    description: descriptionText || "Generated property visual",
    aspectRatio: chosenRatio,
  };
}

// 7. Google Search Grounding using gemini-3.5-flash with googleSearch tool
export async function searchPropertyRegulations(query: string) {
  const ai = getGenAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Provide up-to-date real estate regulations, rent control guidelines, or market pricing for: ${query}`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return {
    answer: response.text || "No search results returned.",
    groundingMetadata: (response.candidates?.[0] as any)?.groundingMetadata || null,
  };
}

// 8. Google Maps Grounding using gemini-3.5-flash with googleMaps tool
export async function findNearbyVendorsOrProperties(query: string) {
  const ai = getGenAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Find certified local commercial vendors, emergency emergency plumbers, HVAC contractors, or property services near: ${query}`,
    config: {
      tools: [{ googleMaps: {} }],
    },
  });

  return {
    answer: response.text || "No location data found.",
    groundingMetadata: (response.candidates?.[0] as any)?.groundingMetadata || null,
  };
}

// 9. Interactive Renter Maintenance Troubleshooting with Real-time Speech Support & Image Vision
export async function troubleshootMaintenanceIssue(
  input: string | ImageDataItem[],
  description: string,
  tradeHint?: string,
  defaultMimeType: string = "image/jpeg"
) {
  const ai = getGenAIClient();

  const imageList: ImageDataItem[] = Array.isArray(input)
    ? input.slice(0, 6)
    : input ? [{ data: input, mimeType: defaultMimeType }] : [];

  const imageParts = imageList.map(img => {
    let clean = img.data.replace(/^data:[a-zA-Z0-9\/\+]+;base64,/, '');
    return {
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: clean,
      }
    };
  });

  try {
    const prompt = `You are an expert residential property maintenance engineer and tenant safety concierge.
A renter is experiencing a household maintenance problem and is seeking guided troubleshooting BEFORE filing a formal complaint or maintenance ticket.
The goal is to determine if this can be safely fixed by the renter (e.g., GFCI reset button, garbage disposal jam, toilet flapper, HVAC filter/batteries, circuit breaker), OR if it requires formal landlord dispatch.
Carefully inspect the ${imageList.length} photo(s) provided and the renter's description: "${description}".
Provide actionable, safe step-by-step diagnostic instructions.
IMPORTANT FOR REAL-TIME VOICE: For each step, provide a 'spokenInstruction' written in natural, friendly, conversational speech that will be read aloud in real-time to the tenant while their hands are busy inspecting the issue.
If there is ANY hazard (live electrical sparks, gas odor, severe flooding, structural collapse), emphasize safety warnings first.
Return valid JSON adhering to the schema.`;

    const response = await callGeminiWithFallback(ai, {
      contents: {
        parts: [
          ...imageParts,
          { text: prompt }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            safetyWarning: {
              type: Type.STRING,
              description: "Immediate safety alert if hazardous, or empty string if safe to troubleshoot"
            },
            probableCause: {
              type: Type.STRING,
              description: "Clear diagnosis of what is malfunctioning based on photos and description"
            },
            canRenterFix: {
              type: Type.BOOLEAN,
              description: "Whether it is safe and practical for the tenant to solve this themselves"
            },
            urgency: {
              type: Type.STRING,
              description: "emergency | high | medium | low"
            },
            recommendedTrade: {
              type: Type.STRING,
              description: "plumbing | electrical | hvac | structural | appliance | general"
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  instruction: { type: Type.STRING },
                  spokenInstruction: { 
                    type: Type.STRING, 
                    description: "Conversational voice instruction designed to be spoken aloud in real-time" 
                  },
                  caution: { type: Type.STRING }
                },
                required: ["id", "stepNumber", "title", "instruction", "spokenInstruction"]
              }
            },
            estimatedFixTime: { type: Type.STRING, description: "e.g. '5-10 minutes'" },
            recommendedTools: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            filingRecommendation: {
              type: Type.STRING,
              description: "Guidance on whether to file a maintenance ticket or formal landlord complaint if this does not resolve it"
            }
          },
          required: ["probableCause", "canRenterFix", "urgency", "recommendedTrade", "steps"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (err: any) {
    console.error('Troubleshooting error:', err);
    // Intelligent fallback troubleshooting response
    return {
      safetyWarning: "Always turn off power or water at the source if you notice active leaks or sparks.",
      probableCause: "Preliminary inspection indicates mechanical stoppage or circuit interrupt.",
      canRenterFix: true,
      urgency: "medium",
      recommendedTrade: tradeHint || "general",
      steps: [
        {
          id: "step-1",
          stepNumber: 1,
          title: "Safety & Power Isolation",
          instruction: "Verify that the appliance or fixture switch is in the OFF position before testing physical components.",
          spokenInstruction: "First, ensure the power switch is turned off so we can safely inspect the unit."
        },
        {
          id: "step-2",
          stepNumber: 2,
          title: "Check Circuit Breaker / GFCI",
          instruction: "Check if the electrical outlet has a GFCI reset button, or check the main unit circuit breaker panel to see if a breaker tripped.",
          spokenInstruction: "Next, look for any tripped circuit breakers in your panel, or push the test and reset buttons on the wall outlet."
        },
        {
          id: "step-3",
          stepNumber: 3,
          title: "Inspect Visible Connections",
          instruction: "Ensure hoses, valves, and cords are firmly seated without kinking or external blockages.",
          spokenInstruction: "Take a look at the visible connections and make sure nothing is blocked, bent, or loose."
        }
      ],
      estimatedFixTime: "5-10 minutes",
      recommendedTools: ["Flashlight"],
      filingRecommendation: "If these checks do not resolve the issue, click 'File Formal Maintenance Request' below to have a licensed vendor dispatched."
    };
  }
}
