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

// 1. Photo of Bills & Invoice Analysis using gemini-3.1-pro-preview
export async function analyzeBillImage(base64Data: string, mimeType: string = "image/jpeg") {
  const ai = getGenAIClient();
  const cleanedBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanedBase64,
          },
        },
        {
          text: `You are an expert real estate accounting and billing specialist. Analyze this photo of a bill, invoice, or receipt.
Extract all key data accurately. Return ONLY valid JSON adhering to the specified schema.`
        }
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
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
        required: ["vendorName", "amount", "billType"]
      }
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text);
}

// 2. Photo Maintenance Damage Analysis using gemini-3.1-pro-preview
export async function analyzeMaintenanceDamage(base64Data: string, promptText: string = "", mimeType: string = "image/jpeg") {
  const ai = getGenAIClient();
  const cleanedBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanedBase64,
          },
        },
        {
          text: `You are an expert property maintenance supervisor and structural damage inspector. 
Analyze this photo of an on-site maintenance problem.
User description: "${promptText || 'Inspect damage and triage'}"
Provide a detailed structural and trade evaluation. Return valid JSON.`
        }
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
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

  // Using gemini-3.1-flash-image or fallback
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
