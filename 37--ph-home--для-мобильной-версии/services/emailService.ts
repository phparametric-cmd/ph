
import { HouseState } from "../types";

/**
 * СЕРВИС ОТПРАВКИ ПРОЕКТА
 * Включает все параметры, пожелания и информацию о файлах.
 */
export const sendProjectToEmail = async (house: HouseState, grandTotal: number): Promise<boolean> => {
  
  const SERVICE_ID = "YOUR_SERVICE_ID";   
  const TEMPLATE_ID = "YOUR_TEMPLATE_ID"; 
  const PUBLIC_KEY = "YOUR_PUBLIC_KEY";   

  if (SERVICE_ID === "YOUR_SERVICE_ID") {
    console.warn("[EmailService] Работает в демо-режиме (замените ключи EmailJS).");
    await new Promise(r => setTimeout(r, 1500));
    return true; 
  }

  const fileNames = house.projectFiles.map(f => f.name).join(', ');

  const templateParams = {
    to_email: house.userEmail,
    client_name: house.userName,
    client_phone: house.userPhone,
    house_style: house.type,
    total_area: (house.houseWidth * house.houseLength * house.floors).toFixed(1),
    floors: house.floors,
    plot_dims: `${house.plotWidth}x${house.plotLength}`,
    investment: `${grandTotal.toLocaleString()} ₸`,
    project_narrative: house.aiProjectDescription || "Сформировано автоматически.",
    extra_wishes: house.extraWishes || "Нет дополнительных пожеланий.",
    attached_files_count: house.projectFiles.length,
    file_list: fileNames || "Файлы не приложены.",
    render_url: house.renderFrontUrl || "Приложено в PDF",
    site_plan_url: house.sitePlanUrl || "Приложено в PDF"
  };

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id: PUBLIC_KEY,
        template_params: templateParams,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("[EmailService] Error:", error);
    return false;
  }
};
