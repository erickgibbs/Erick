import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageData } from '../types';

export const editImageWithGemini = async (
  imageData: ImageData,
  prompt: string,
  maskData?: { base64: string; mimeType: string; }
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = {
    inlineData: {
      data: imageData.base64,
      mimeType: imageData.mimeType,
    },
  };

  const textPart = { text: prompt };

  const parts: any[] = [imagePart];
  
  if (maskData) {
    const maskPart = {
      inlineData: {
        data: maskData.base64,
        mimeType: maskData.mimeType,
      },
    };
    parts.push(maskPart);
    parts.push({ text: `Using the provided mask, apply the following instruction only to the masked area of the original image: "${prompt}". The masked area is where you should perform the edit. Return the fully edited image.` });
  } else {
    parts.push(textPart);
  }


  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data; // This is the base64 string of the new image
      }
    }

    throw new Error("No image data found in the Gemini response.");
  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    if (error instanceof Error) {
        if(error.message.includes("API key not valid")){
            throw new Error("Your API key is invalid. Please check your configuration.");
        }
    }
    throw new Error("Failed to process the image. The model may not be able to fulfill this request.");
  }
};