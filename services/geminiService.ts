
import { GoogleGenAI, Type } from "@google/genai";

// Use process.env.API_KEY directly for initialization as per guidelines
export async function extractVisitorInfo(base64Image: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: "Extract name, ID number (13 digits if possible), and license plate from this card or vehicle. Return only JSON.",
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          idNumber: { type: Type.STRING },
          licensePlate: { type: Type.STRING },
        },
        required: ["name", "idNumber", "licensePlate"]
      }
    }
  });

  try {
    // Access the text property directly (it is a property, not a method)
    const text = response.text || '{}';
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse OCR response", e);
    return { name: "", idNumber: "", licensePlate: "" };
  }
}
