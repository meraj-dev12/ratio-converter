import { GoogleGenAI, Type } from '@google/genai';
import type { Crop, PercentCrop } from 'react-image-crop';

// The GoogleGenAI instance is lazily initialized to avoid
// a crash on load if the API key is not configured.
let ai: GoogleGenAI | null = null;

function getAiInstance(): GoogleGenAI {
  if (!ai) {
    // The API key must be obtained from the environment variable.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      // Throw a specific error if the key is missing.
      throw new Error("API_KEY_NOT_CONFIGURED");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
            resolve(result.split(',')[1]);
        } else {
            reject(new Error("Failed to read file"));
        }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export async function getSmartCrop(imageFile: File): Promise<PercentCrop | null> {
    const aiInstance = getAiInstance();
    const imagePart = await fileToGenerativePart(imageFile);

    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    imagePart,
                    { text: 'Analyze this image to identify the main subject. Provide the optimal bounding box for cropping, focusing on this subject. The bounding box coordinates should be percentages of the image dimensions. Return a JSON object with keys "x", "y", "width", and "height". Ensure the values are numbers between 0 and 100.' }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        x: { type: Type.NUMBER, description: 'The x-coordinate of the top-left corner as a percentage (0-100).' },
                        y: { type: Type.NUMBER, description: 'The y-coordinate of the top-left corner as a percentage (0-100).' },
                        width: { type: Type.NUMBER, description: 'The width of the crop area as a percentage (0-100).' },
                        height: { type: Type.NUMBER, description: 'The height of the crop area as a percentage (0-100).' }
                    },
                    required: ['x', 'y', 'width', 'height']
                }
            }
        });

        const text = response.text;
        if (!text) return null;

        // Clean up response text to ensure valid JSON (remove markdown code blocks if present)
        let jsonStr = text.trim();
        const startIndex = jsonStr.indexOf('{');
        const endIndex = jsonStr.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1) {
            jsonStr = jsonStr.substring(startIndex, endIndex + 1);
        } else {
             console.error("No JSON object found in response:", text);
             return null;
        }

        const data = JSON.parse(jsonStr);
        
        if (data.x != null && data.y != null && data.width != null && data.height != null) {
            return {
                unit: '%',
                x: Math.max(0, data.x),
                y: Math.max(0, data.y),
                width: Math.min(100 - Math.max(0, data.x), data.width),
                height: Math.min(100 - Math.max(0, data.y), data.height),
            };
        }
    } catch (e) {
        console.error("Failed to parse smart crop response:", e);
        // Rethrow API key error so App.tsx can handle it specifically
        if (e instanceof Error && e.message === "API_KEY_NOT_CONFIGURED") {
             throw e;
        }
        return null;
    }

    return null;
}