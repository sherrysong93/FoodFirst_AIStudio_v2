
import { GoogleGenAI, Type } from "@google/genai";

export interface ExtractedFoodInfo {
  name: string;
  category: string;
  productionDate?: string;
  shelfLifeValue?: number;
  shelfLifeUnit?: 'day' | 'month' | 'year';
}

// Fixed Gemini API initialization and contents structure following @google/genai guidelines
export const extractFoodInfoFromImage = async (base64Image: string): Promise<ExtractedFoodInfo | null> => {
  // Always use a named parameter and obtain API key exclusively from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // contents should be an object with parts for multi-part requests
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: "Analyze this food label/package. Extract the food name, the most suitable category (vegetables, fruits, dairy, meat, fish, others), production date (if visible, format YYYY-MM-DD), and shelf life duration (numeric value and unit: day, month, year). Return only JSON.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { 
              type: Type.STRING, 
              description: "Must be one of: vegetables, fruits, dairy, meat, fish, others" 
            },
            productionDate: { type: Type.STRING },
            shelfLifeValue: { type: Type.NUMBER },
            shelfLifeUnit: { type: Type.STRING },
          },
          required: ["name", "category"],
        },
      },
    });

    // Directly access text property from GenerateContentResponse
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as ExtractedFoodInfo;
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return null;
  }
};
