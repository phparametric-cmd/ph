import { GoogleGenAI } from "@google/genai";
import { HouseState } from "../types";

/**
 * Генератор технического паспорта с использованием Google Gemini API.
 * Формирует профессиональный структурированный текст на основе параметров проекта на выбранном языке.
 */
export const generateProjectNarrative = async (house: HouseState): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const plotArea = house.plotWidth * house.plotLength;
  const totalHouseArea = house.houseWidth * house.houseLength * house.floors;

  const floorPlanDetails = house.calculatedPlan?.map(f => {
    const roomsStr = f.rooms.map(r => `${r.name} (${r.area.toFixed(1)}м²)`).join(', ');
    const comment = house.floorComments[f.floorNumber - 1];
    return `FLOOR ${f.floorNumber}: ${roomsStr}${comment ? `\nNOTE: ${comment}` : ''}`;
  }).join('\n\n') || '';

  const targetLang = house.lang === 'ru' ? 'Russian' : (house.lang === 'en' ? 'English' : 'Kazakh');

  const prompt = `Compose a professional architectural description for a technical passport of a private house.
  Concept: ${house.type}. 
  Style details: ${house.styleDescription}
  
  Construction parameters:
  - Plot: ${house.plotWidth}x${house.plotLength}m (${(plotArea / 100).toFixed(1)} are)
  - House footprint: ${house.houseWidth}x${house.houseLength}m
  - Floors: ${house.floors}
  - Total house area: ${totalHouseArea.toFixed(1)} m²
  
  Explication of rooms:
  ${floorPlanDetails}
  
  Additional client wishes: ${house.extraWishes || 'none'}
  
  The text should be structured, official, yet modern and inspiring. 
  RETURN THE TEXT ONLY IN ${targetLang.toUpperCase()} LANGUAGE.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Specification generated.";
  } catch (error) {
    console.error("Gemini Narrative Error:", error);
    return `ARCHITECTURAL CONCEPT: ${house.type.toUpperCase()}\nTOTAL AREA: ${totalHouseArea.toFixed(1)} m²`;
  }
};

/**
 * Генерация фотореалистичной архитектурной визуализации.
 */
export const generateArchitecturalImage = async (
  house: HouseState, 
  view: 'front' | 'top', 
  screenshotBase64?: string
): Promise<string> => {
  if (view === 'top') return screenshotBase64 || "";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const textPart = { 
      text: `Professional architectural render of a modern house in ${house.type} style. 
      Details: ${house.styleDescription}. 
      Environment: Realistic lighting, high-end architectural photography, cinematic quality.` 
    };

    const parts: any[] = [textPart];
    
    if (screenshotBase64) {
      const base64Data = screenshotBase64.includes(',') ? screenshotBase64.split(',')[1] : screenshotBase64;
      parts.unshift({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data,
        },
      });
      textPart.text = `Transform this 3D mockup into a photorealistic architectural visualization. 
      Follow the geometry of the house shown exactly. 
      Style: ${house.type}. 
      Make it look like a real professional architectural photo.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
  }

  return screenshotBase64 || house.styleImageUrl || "";
};