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
    const promptInstructions = `You are a crisis management analyzer. 
    Return a JSON object with: title, description, hashtags, category, 
    severity, numerical_figures, vehicles_needed, and personnel_assigned.`;

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