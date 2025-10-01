import { GoogleGenAI, Type } from '@google/genai';
import type { Crop } from 'react-image-crop';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export async function getSmartCrop(imageFile: File): Promise<Crop | null> {
    const imagePart = await fileToGenerativePart(imageFile);

    const response = await ai.models.generateContent({
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

    try {
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        
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
        return null;
    }

    return null;
}
