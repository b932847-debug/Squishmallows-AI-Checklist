
import { GoogleGenAI } from "@google/genai";

// Assume API_KEY is set in the environment
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("Gemini API key not found. Image recognition will not work.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Function to convert a base64 string to a GenerativePart
function fileToGenerativePart(base64Data: string, mimeType: string) {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
}

export const identifySquishmallow = async (base64Image: string, allNames: string[]): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key for Gemini is not configured.");
  }

  const model = 'gemini-2.5-flash';
  const imagePart = fileToGenerativePart(base64Image, "image/jpeg");
  
  const prompt = `Identify the Squishmallow character in this image. Choose the best match from the following list of names. Respond with ONLY the character's name from the list provided. If you cannot identify a character from the list, respond with "Unknown".

List of names: ${allNames.join(', ')}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, { text: prompt }] },
    });
    
    const text = response.text.trim();

    // Validate if the response is one of the names provided
    if (allNames.includes(text)) {
      return text;
    } else {
      return "Unknown";
    }
  } catch (error) {
    console.error("Error identifying Squishmallow:", error);
    throw new Error("Failed to get a response from the AI model.");
  }
};
