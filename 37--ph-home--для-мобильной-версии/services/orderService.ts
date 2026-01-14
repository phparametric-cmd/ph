
import { HouseState } from "../types";
import JSZip from "jszip";
import fileSaver from "file-saver";

interface OrderPayload {
  house: HouseState;
  passportBlob?: Blob;
  calculationBlob?: Blob;
}

/**
 * Сервис для обработки заказа проекта.
 * Генерирует ZIP-архив со всей документацией.
 */
export const processProjectOrder = async ({ house, passportBlob, calculationBlob }: OrderPayload): Promise<boolean> => {
  try {
    const zip = new JSZip();
    const folderName = `${house.name}_${house.userName || 'Client'}`;
    const projectFolder = zip.folder(folderName);

    if (!projectFolder) throw new Error("Could not create ZIP folder");

    // 1. Формируем текст для ИИ (AI-Ready Structured Text)
    const plotAreaSotka = (house.plotWidth * house.plotLength) / 100;
    const totalArea = house.houseWidth * house.houseLength * house.floors;
    
    let aiText = `### PROJECT DATA FOR AI ANALYSIS ###\n`;
    aiText += `PROJECT_ID: ${house.name}\n`;
    aiText += `CLIENT: ${house.userName}\n`;
    aiText += `DATE: ${house.projectDate}\n`;
    aiText += `CONTACT: ${house.userPhone} | ${house.userEmail}\n\n`;
    
    aiText += `[ARCHITECTURE_SPECS]\n`;
    aiText += `STYLE: ${house.type}\n`;
    aiText += `LIVING_FORMAT: ${house.format.toUpperCase()}\n`;
    aiText += `TOTAL_AREA_M2: ${totalArea.toFixed(2)}\n`;
    aiText += `FLOORS: ${house.floors}\n`;
    aiText += `FOOTPRINT_WIDTH_M: ${house.houseWidth}\n`;
    aiText += `FOOTPRINT_DEPTH_M: ${house.houseLength}\n`;
    aiText += `PLOT_WIDTH_M: ${house.plotWidth}\n`;
    aiText += `PLOT_DEPTH_M: ${house.plotLength}\n`;
    aiText += `PLOT_AREA_SOTKA: ${plotAreaSotka.toFixed(2)}\n\n`;

    aiText += `[EXPLICATION_OF_ROOMS]\n`;
    house.calculatedPlan?.forEach(floor => {
      aiText += `FLOOR_${floor.floorNumber}:\n`;
      floor.rooms.forEach(r => {
        aiText += `  - ${r.name}: ${r.area.toFixed(2)}m2\n`;
      });
    });
    aiText += `\n`;

    aiText += `[LANDSCAPE_OBJECTS]\n`;
    if (house.hasTerrace) aiText += `- Terrace: ${house.terraceWidth}x${house.terraceDepth}m\n`;
    if (house.hasPool) aiText += `- Pool: ${house.poolWidth}x${house.poolDepth}m\n`;
    if (house.hasBath) aiText += `- Bathhouse: ${house.bathWidth}x${house.bathDepth}m\n`;
    if (house.hasBBQ) aiText += `- BBQ Zone: ${house.bbqWidth}x${house.bbqDepth}m\n`;
    if (house.hasGarage) aiText += `- Garage: ${house.garageCars} cars\n`;
    if (house.hasCarport) aiText += `- Carport: ${house.carportCars} cars\n`;
    if (house.hasCustomObj) aiText += `- ${house.customObjLabel}: ${house.customObjWidth}x${house.customObjDepth}m\n`;
    aiText += `\n`;

    aiText += `[CLIENT_WISHES]\n`;
    aiText += `PLANNING: ${house.planningWishes || 'No specific planning wishes'}\n`;
    aiText += `ADDITIONAL: ${house.extraWishes || 'No additional notes'}\n`;
    aiText += `FILES_ATTACHED: ${house.projectFiles.length}\n`;

    projectFolder.file("AI_PROJECT_SUMMARY.txt", aiText);

    // 2. Добавляем PDF-файлы
    if (passportBlob) {
      projectFolder.file("ARCHITECTURAL_PASSPORT.pdf", passportBlob);
    }
    if (calculationBlob) {
      projectFolder.file("COST_CALCULATION.pdf", calculationBlob);
    }

    // 3. Добавляем рендеры (base64)
    if (house.renderFrontUrl && house.renderFrontUrl.startsWith('data:image')) {
      const frontData = house.renderFrontUrl.split(',')[1];
      projectFolder.file("RENDER_FRONT.png", frontData, { base64: true });
    }

    if (house.sitePlanUrl && house.sitePlanUrl.startsWith('data:image')) {
      const siteData = house.sitePlanUrl.split(',')[1];
      projectFolder.file("SITE_PLAN.png", siteData, { base64: true });
    }

    // 4. Добавляем прикрепленные пользователем файлы
    house.projectFiles.forEach(file => {
      const base64Data = file.data.split(',')[1];
      projectFolder.file(`ATTACHMENT_${file.name}`, base64Data, { base64: true });
    });

    // 5. Генерируем и скачиваем ZIP
    const content = await zip.generateAsync({ type: "blob" });
    const saveAs = (fileSaver as any).saveAs || fileSaver;
    if (typeof saveAs === 'function') {
      saveAs(content, `${folderName}.zip`);
    }

    console.log("[Order Processed] Archive ready and downloaded.");
    return true;
  } catch (error) {
    console.error("Order Processing Error:", error);
    return false;
  }
};
