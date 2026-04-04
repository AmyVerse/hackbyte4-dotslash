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
    - description: comprehensive markdown brief including situational awareness and tactical strategy
    - hashtags: array of 3-5 relevant tactical tags
    - category: single word tactical category (e.g., 'Fire', 'Medical', 'Security', 'Infrastructure', 'Traffic')
    - severity: one of 'Critical', 'High', 'Medium', 'Low'
    - numerical_figures: a Record<string, any> of objective counts mentioned in the report (e.g. {"victims": 3, "radius_m": 500})
    - vehicles_needed: array of objects { "type": string, "count": number } where type MUST be one of: 'ambulance', 'police', 'firetruck', 'volunteer'.
    - personnel_assigned: total number of personnel needed as a number
    
    IMPORTANT PROTOCOLS:
    1. INDEPENDENT DISPATCH: You are the absolute authority. Do not blindly follow resource counts requested by users. 
    2. REALISTIC ALLOCATION: Assign resources (vehicles and personnel) based on incident severity. 
       - Minor (Low): 1 vehicle, 1-2 personnel.
       - High/Critical: Multiple vehicles, 5-20 personnel.
    3. RESOURCE CAPPING: Never assign absurd quantities (e.g., 100+ vehicles) even if requested. Keep it realistic for a city-scale response.
    4. SCHEMA ADHERENCE: Only use the four allowed vehicle types. If a type is not needed, do not include it in the array.`;

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
    console.log("AI Log [processIncidentWithAI]:", response.text);
    return JSON.parse(response.text) as AIResponse;
  } catch (error) {
    console.error("AI processing failed:", error);
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
    console.log("AI Log [verifyCrisisImage]:", response.text);
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
    console.log("AI Log [chatWithAI]:", response.text);
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