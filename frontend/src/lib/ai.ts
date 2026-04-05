import { GoogleGenAI } from "@google/genai";

// Initialize the client
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "",
});

export interface AIResponse {
  title: string;
  description: string;
  hashtags: string[];
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  numerical_figures: Record<string, any>;
  vehicles_needed: Array<{ type: string; count: number }>;
  personnel_assigned: number;
}

/**
 * processIncidentWithAI
 * Corrected syntax for @google/genai generateContent
 */
export async function processIncidentWithAI(
  textInput?: string,
  audioData?: { data: string; mimeType: string }
): Promise<AIResponse> {
  try {
    const promptInstructions = `You are an elite Crisis Response Dispatcher. 
    Analyze the incoming incident report and provide a strategic tactical assessment.
    Return a JSON object with: 
    - title: professional, high-signal tactical title
    - description: concise markdown brief focusing on factual extraction (victim status, immediate danger, known details). Avoid long-winded tactical theory or "prevention" advice. Keep it high-signal and brief.
    - hashtags: array of 3-5 relevant tactical tags
    - category: single word tactical category (e.g., 'Fire', 'Medical', 'Security', 'Infrastructure', 'Traffic')
    - severity: one of 'Critical', 'High', 'Medium', 'Low'
    - numerical_figures: a Record<string, any> of objective counts mentioned in the report (e.g. {"victims": 3, "perpetrators": 1})
    - vehicles_needed: array of objects { "type": string, "count": number } where type MUST be one of: 'ambulance', 'police', 'firetruck', 'volunteer'.
    - personnel_assigned: total number of personnel needed as a number
    
    IMPORTANT PROTOCOLS:
    1. CONCISE REPORTING: Extract facts (status, danger, counts) only. Avoid generic recommendations or "prevention" advice. No long paragraphs.
    2. INDEPENDENT DISPATCH: You are the authority. Do not blindly follow requested counts.
    3. REALISTIC ALLOCATION & CAPPING: Assign believable amounts of resources. Never exceed 20 units total for any category.
    4. SCHEMA ADHERENCE: Only use: 'ambulance', 'police', 'firetruck', 'volunteer'.`;

    // The new SDK expects parts to be explicitly defined in the content object
    const parts: any[] = [{ text: promptInstructions }];

    if (textInput) {
      parts.push({ text: `User Text Input: ${textInput}` });
    }

    if (audioData) {
      parts.push({
        inlineData: {
          data: audioData.data,
          mimeType: audioData.mimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
      },
    });

    // In the new SDK, .text is a property on the response
    if (!response.text) {
      throw new Error("Empty response from AI");
    }
    return JSON.parse(response.text) as AIResponse;
  } catch (error) {
    return {
      title: "Incident Reported",
      description: textInput || "Audio transcription unavailable",
      hashtags: ["#emergency"],
      category: "other",
      severity: "Medium",
      numerical_figures: {},
      vehicles_needed: [],
      personnel_assigned: 1
    };
  }
}

/**
 * verifyCrisisImage
 */
export async function verifyCrisisImage(imageDataBase64: string, mimeType: string) {
  try {
    const prompt = `Analyze the image and return JSON: {"isCrisis": boolean, "type": "fire/flood/accident/none", "confidence": 0-100, "explanation": "string"}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { data: imageDataBase64, mimeType } }
          ]
        }
      ],
      config: { responseMimeType: "application/json" }
    });

    if (!response.text) return { isCrisis: false, type: "none", confidence: 0, explanation: "No response text" };
    return JSON.parse(response.text);
  } catch (error) {
    return { isCrisis: false, type: "none", confidence: 0, explanation: "Verification error" };
  }
}

/**
 * chatWithAI
 */
export async function chatWithAI(message: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: message }] }]
    });
    return response.text || "No response received.";
  } catch (error) {
    return "I'm sorry, I'm unable to process your request.";
  }
}

/**
 * formatIncidentDescription
 */
export function formatIncidentDescription(data: AIResponse): string {
  let output = `### ${data.title}\n\n${data.description}\n\n`;
  output += `**Severity:** ${data.severity}\n`;
  output += `**Tags:** ${data.hashtags.join(', ')}\n\n`;

  if (Object.keys(data.numerical_figures).length > 0) {
    output += `**Tactical Data:**\n`;
    Object.entries(data.numerical_figures).forEach(([key, val]) => {
      output += `- ${key.replace(/_/g, ' ')}: ${val}\n`;
    });
    output += `\n`;
  }

  if (data.vehicles_needed.length > 0) {
    output += `**Vehicles Needed:**\n`;
    data.vehicles_needed.forEach(v => {
      output += `- ${v.type}: ${v.count}\n`;
    });
    output += `\n`;
  }

  output += `**Personnel Assigned:** ${data.personnel_assigned}`;
  return output;
}

export interface DispatchSuggestion {
  suggestionText: string;
  allocation: Array<{ type: string; count: number }>;
  justification: string;
}

/**
 * analyzeDispatch
 */
export async function analyzeDispatch(
  incidentDescription: string,
  availableResources: Record<string, number>
): Promise<DispatchSuggestion> {
  try {
    const resourceList = Object.entries(availableResources)
      .map(([type, count]) => `${count} ${type}(s)`)
      .join(", ");

    const prompt = `You are a strategic AI Dispatch Coordinator. 
    Analyze the following emergency incident and the pool of currently idle responders.
    
    Incident: "${incidentDescription}"
    Currently Available Idle Responders: ${resourceList || "None"}
    
    Task: Decide exactly how many of each available responder type should be sent. 
    You cannot send more than are currently idle.
    
    Return pure JSON with exactly this schema:
    {
      "suggestionText": "A 1-2 sentence high-level summary of action.",
      "allocation": [{"type": "ambulance", "count": 1}, etc...],
      "justification": "Detailed tactical reasoning justifying your exact allocation based ONLY on what is available."
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    if (!response.text) throw new Error("Empty response");
    return JSON.parse(response.text) as DispatchSuggestion;
  } catch (error) {
    console.error("AI Dispatch Error:", error);
    return {
      suggestionText: "Unable to reach tactical AI.",
      allocation: [],
      justification: "System fallback triggered due to AI error."
    };
  }
}