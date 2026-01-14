
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HouseState, FloorPlan, RoomInfo, ProjectFile, LivingFormat } from '../types';
import { processProjectOrder } from '../services/orderService';
import { generatePDFBlob } from '../services/pdfService';
import { getTranslation } from '../services/i18n';

interface ControlsProps {
  house: HouseState;
  setHouse: React.Dispatch<React.SetStateAction<HouseState>>;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  onCaptureRef?: React.MutableRefObject<((mode?: 'current' | 'top') => string) | null>;
  onBackToWelcome?: () => void;
  onSetAssistantMsg?: (msg: { title: string, text: string } | undefined) => void;
}

const LOGO_URL = "https://raw.githubusercontent.com/phparametric-cmd/ph/3a1686781dd89eb77cf6f7ca10c15c739ae48eff/Ph.jpeg";
const MODEL_PHOTO_URL = "https://raw.githubusercontent.com/phparametric-cmd/ph/2de6871c472cb2fe5ef06c87eb26338f2ba95bf0/%D1%84%D0%BE%D1%82%D0%BE%20%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D0%B0%20.jpg";

const Controls: React.FC<ControlsProps> = ({ house, setHouse, currentStep, setCurrentStep, onCaptureRef, onBackToWelcome, onSetAssistantMsg }) => {
  const t = getTranslation(house.lang);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const hiddenCaptureRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Для обработки жестов и таймеров
  const touchStartY = useRef<number>(0);
  const inactivityTimer = useRef<any>(null);

  // Авто-открытие через 3 секунды после старта
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMobileExpanded(true);
      resetInactivityTimer();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Таймер бездействия (5 секунд)
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setIsMobileExpanded(false);
    }, 5000);
  };

  // Обработка клика вне панели (на 3D поле)
  useEffect(() => {
    const handleGlobalInteraction = (e: MouseEvent | TouchEvent) => {
      if (!isMobileExpanded) return;

      const isClickInside = panelRef.current?.contains(e.target as Node);
      
      if (!isClickInside) {
        setIsMobileExpanded(false);
      } else {
        resetInactivityTimer();
      }
    };

    window.addEventListener('pointerdown', handleGlobalInteraction as any);
    return () => {
      window.removeEventListener('pointerdown', handleGlobalInteraction as any);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [isMobileExpanded]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY.current;

    // Уменьшим порог для более отзывчивого свайпа (было 50, стало 30)
    if (diff > 30) { // Свайп вниз - сворачиваем
      setIsMobileExpanded(false);
    } else if (diff < -30) { // Свайп вверх - разворачиваем
      setIsMobileExpanded(true);
      resetInactivityTimer();
    }
  };
  
  const STEPS = useMemo(() => {
    const s = [
      { id: 'site', label: t.plotParams.split(' ').pop() || "", icon: 'fa-map-location-dot' },
      { id: 'structure', label: t.houseParams.split(' ').pop() || "", icon: 'fa-house-chimney' },
      { id: 'planning', label: t.planning, icon: 'fa-layer-group' },
      { id: 'landscape', label: t.objects, icon: 'fa-leaf' },
      { id: 'parking', label: t.parking, icon: 'fa-warehouse' },
      { id: 'additions', label: t.finish, icon: 'fa-flag-checkered' },
      { id: 'finish', label: 'ID', icon: 'fa-file-signature' },
      { id: 'final_calc', label: '$', icon: 'fa-file-invoice-dollar' },
    ];

    if (house.lang === 'en') {
      s[0].label = "Plot";
      s[1].label = "House";
    } else if (house.lang === 'kk') {
      s[0].label = "Учаске";
      s[1].label = "Үй";
    }
    return s;
  }, [t, house.lang]);

  const totalHouseArea = house.houseWidth * house.houseLength * house.floors;
  const areaPerFloor = totalHouseArea / house.floors;

  const handleSelectLivingFormat = (format: LivingFormat) => {
    setHouse(prev => ({ ...prev, format }));
    resetInactivityTimer();
  };

  const handleGoToPassport = async () => {
    if (onCaptureRef?.current) {
      const topView = onCaptureRef.current('top');
      const frontView = onCaptureRef.current('current');
      
      setHouse(prev => ({ 
        ...prev, 
        sitePlanUrl: topView,
        renderFrontUrl: frontView
      }));
    }
    setCurrentStep(6);
  };

  const architecturalExplication = useMemo(() => {
    const isSignature = house.format === 'signature';
    const floorsCount = house.floors;
    const wallConstructionCoeff = 0.15;
    const hallwayCoeff = isSignature ? 0.20 : 0.15;
    const stairSize = 7; 
    const MIN_BEDROOM_SIZE = 16.0; 
    const rt = t.rooms;

    const plans: FloorPlan[] = [];

    for (let i = 1; i <= floorsCount; i++) {
      let floorRooms: RoomInfo[] = [];
      const constructionArea = areaPerFloor * wallConstructionCoeff;
      const currentHallway = areaPerFloor * hallwayCoeff;
      const currentStair = (floorsCount > 1) ? stairSize : 0;
      let availableForLiving = areaPerFloor - constructionArea - currentHallway - currentStair;

      if (i === 1) {
        floorRooms.push({ name: rt.hallway, area: Math.max(8, availableForLiving * 0.12) });
        floorRooms.push({ name: rt.guestWC, area: 4.5 });
        floorRooms.push({ name: rt.tech, area: Math.max(7, availableForLiving * 0.1) });
        
        let livingZoneArea = availableForLiving - (8 + 4.5 + 7);

        if (floorsCount === 1) {
          const masterBase = Math.max(28, areaPerFloor * 0.25);
          floorRooms.push({ name: rt.master, area: Math.max(MIN_BEDROOM_SIZE, masterBase * 0.58) });
          floorRooms.push({ name: `${rt.bathroom}/${rt.wardrobe} Master`, area: masterBase * 0.42 });
          livingZoneArea -= masterBase;

          const unitArea = MIN_BEDROOM_SIZE + (isSignature ? 5 : 0);
          let autoBedroomCount = Math.floor(livingZoneArea / unitArea);
          autoBedroomCount = Math.min(autoBedroomCount, 4);

          for (let b = 0; b < autoBedroomCount; b++) {
             floorRooms.push({ name: `${rt.kids} №${b + 2}`, area: MIN_BEDROOM_SIZE });
             if (isSignature) floorRooms.push({ name: `WC №${b + 2}`, area: 4.5 });
             livingZoneArea -= unitArea;
          }
        }

        if (house.hasOffice) {
           const officeArea = Math.max(MIN_BEDROOM_SIZE, isSignature ? 18 : 16);
           floorRooms.push({ name: rt.office, area: officeArea });
           if (isSignature) {
             floorRooms.push({ name: `WC (En-suite)`, area: 4.5 });
             livingZoneArea -= (officeArea + 4.5);
           } else {
             livingZoneArea -= officeArea;
           }
        }

        if (house.isKitchenLivingCombined) {
          floorRooms.push({ name: rt.kitchenLiving, area: Math.max(30, livingZoneArea) });
        } else {
          const kitchenArea = Math.max(16, livingZoneArea * 0.4);
          const calculatedLivingArea = Math.max(24, livingZoneArea * 0.6);
          floorRooms.push({ name: rt.kitchen, area: kitchenArea });
          floorRooms.push({ name: rt.living, area: calculatedLivingArea });
        }
      } else if (i === 2) {
        const masterBase = isSignature ? 32 : 30; 
        floorRooms.push({ name: rt.masterSuite, area: Math.max(MIN_BEDROOM_SIZE, masterBase * 0.52) });
        floorRooms.push({ name: rt.wardrobe + " Master", area: masterBase * 0.23 });
        floorRooms.push({ name: rt.bathroom + " Master", area: masterBase * 0.25 });

        let remainingLiving = availableForLiving - masterBase;
        
        floorRooms.push({ name: rt.kids, area: MIN_BEDROOM_SIZE });
        if (isSignature) floorRooms.push({ name: rt.bathroom + " №1", area: 5.0 });
        remainingLiving -= (isSignature ? (MIN_BEDROOM_SIZE + 5.0) : MIN_BEDROOM_SIZE);

        const unitArea = MIN_BEDROOM_SIZE + (isSignature ? 5.0 : 0);
        let extraBedroomCount = Math.floor(remainingLiving / unitArea);
        extraBedroomCount = Math.min(extraBedroomCount, 3);

        for (let b = 0; b < extraBedroomCount; b++) {
          floorRooms.push({ name: `${rt.kids} №${b + 2}`, area: MIN_BEDROOM_SIZE });
          if (isSignature) {
            floorRooms.push({ name: rt.bathroom + ` №${b + 2}`, area: 5.0 });
          }
        }

        if (!isSignature) {
          floorRooms.push({ name: rt.bathroom, area: 6.5 });
          floorRooms.push({ name: rt.laundry, area: 6.0 });
        } else {
          floorRooms.push({ name: rt.laundry, area: 7.0 });
        }
      } else {
        floorRooms.push({ name: rt.media, area: availableForLiving * 0.5 });
        floorRooms.push({ name: rt.play, area: availableForLiving * 0.3 });
        floorRooms.push({ name: rt.guestWC, area: 5.5 });
      }

      floorRooms.push({ name: rt.halls, area: currentHallway });
      if (currentStair > 0) floorRooms.push({ name: rt.stairs, area: currentStair });
      floorRooms.push({ name: rt.construction, area: constructionArea });

      let sum = floorRooms.reduce((acc, r) => acc + r.area, 0);
      let diff = areaPerFloor - sum;
      
      if (Math.abs(diff) > 0.1) {
         const expandable = floorRooms.filter(r => 
            r.name.toLowerCase().includes('bedroom') || 
            r.name.toLowerCase().includes('living') || 
            r.name.toLowerCase().includes('спальня') || 
            r.name.toLowerCase().includes('бөлме')
         );
         if (expandable.length > 0) {
            expandable.forEach(r => r.area += diff / (expandable.length || 1));
         }
      }

      plans.push({ floorNumber: i, rooms: floorRooms, comment: "" });
    }
    return plans;
  }, [areaPerFloor, house.format, house.hasOffice, house.isKitchenLivingCombined, house.floors, totalHouseArea, t.rooms]);

  useEffect(() => {
    setHouse(prev => ({ ...prev, calculatedPlan: architecturalExplication }));
  }, [architecturalExplication, setHouse]);

  const toggleMobileStep = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index === currentStep) {
      setIsMobileExpanded(!isMobileExpanded);
    } else {
      setCurrentStep(index);
      setIsMobileExpanded(true);
    }
    resetInactivityTimer();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHouse(prev => ({
          ...prev,
          projectFiles: [...prev.projectFiles, { name: file.name, type: file.type, data: reader.result as string }]
        }));
      };
      reader.readAsDataURL(file);
    });
    resetInactivityTimer();
  };

  const handleSavePDF = async (ref: React.RefObject<HTMLDivElement>, name: string, selector: string) => {
    const el = ref.current?.querySelector(selector) as HTMLElement;
    if (!el) return;
    setIsExporting(true);
    try {
      const blob = await generatePDFBlob(el, name);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const costData = useMemo(() => {
    let archPrice = 0;
    if (totalHouseArea <= 250) archPrice = 1200000;
    else if (totalHouseArea <= 450) archPrice = 2250000;
    else if (totalHouseArea <= 700) archPrice = 3150000;
    else archPrice = totalHouseArea * 4500;

    const plotAreaSotka = (house.plotWidth * house.plotLength) / 100;
    const landscapePrice = plotAreaSotka * 100000;

    const getGWidth = (cars: number) => cars === 1 ? 4.5 : (cars === 2 ? 7.5 : 10.5);
    const getCWidth = (cars: number) => cars === 1 ? 4 : (cars === 2 ? 7 : 10);

    const objects = [
      { id: 'terrace', label: t.terrace.toUpperCase(), active: house.hasTerrace, area: house.terraceWidth * house.terraceDepth },
      { id: 'pool', label: t.pool.toUpperCase(), active: house.hasPool, area: house.poolWidth * house.poolDepth },
      { id: 'bath', label: t.bath.toUpperCase(), active: house.hasBath, area: house.bathWidth * house.bathDepth },
      { id: 'bbq', label: t.bbq.toUpperCase(), active: house.hasBBQ, area: house.bbqWidth * house.bbqDepth },
      { id: 'garage', label: t.garage.toUpperCase(), active: house.hasGarage, area: getGWidth(house.garageCars) * 6.5 },
      { id: 'carport', label: t.carport.toUpperCase(), active: house.hasCarport, area: getCWidth(house.carportCars) * 6 },
      { id: 'custom', label: t.hozblock.toUpperCase(), active: house.hasCustomObj, area: house.customObjWidth * house.customObjDepth },
    ].map(obj => ({
      ...obj,
      cost: obj.active ? Math.round(obj.area * 2000) : 0
    }));

    return {
      archPrice,
      landscapePrice,
      objects,
      grandTotal: archPrice + landscapePrice + objects.reduce((sum, o) => sum + o.cost, 0),
    };
  }, [house, totalHouseArea, t]);

  const allBuildings = useMemo(() => {
    const b = [];
    const getGWidth = (cars: number) => cars === 1 ? 4.5 : (cars === 2 ? 7.5 : 10.5);
    const getCWidth = (cars: number) => cars === 1 ? 4 : (cars === 2 ? 7 : 10);

    b.push({ name: house.lang === 'ru' ? 'Основной дом' : (house.lang === 'en' ? 'Main House' : 'Негізгі үй'), w: house.houseWidth, d: house.houseLength, area: totalHouseArea });
    if (house.hasTerrace) b.push({ name: t.terrace, w: house.terraceWidth, d: house.terraceDepth, area: house.terraceWidth * house.terraceDepth });
    if (house.hasPool) b.push({ name: t.pool, w: house.poolWidth, d: house.poolDepth, area: house.poolWidth * house.poolDepth });
    if (house.hasBath) b.push({ name: t.bath, w: house.bathWidth, d: house.bathDepth, area: house.bathWidth * house.bathDepth });
    if (house.hasBBQ) b.push({ name: house.bbqLabel || t.bbq, w: house.bbqWidth, d: house.bbqDepth, area: house.bbqWidth * house.bbqDepth });
    if (house.hasGarage) b.push({ name: t.garage, w: getGWidth(house.garageCars), d: 6.5, area: getGWidth(house.garageCars) * 6.5 });
    if (house.hasCarport) b.push({ name: t.carport, w: getCWidth(house.carportCars), d: 6, area: getCWidth(house.carportCars) * 6 });
    if (house.hasCustomObj) b.push({ name: house.customObjLabel || t.hozblock, w: house.customObjWidth, d: house.customObjDepth, area: house.customObjWidth * house.customObjDepth });
    return b;
  }, [house, t, totalHouseArea]);

  const totalBuildingsArea = useMemo(() => allBuildings.reduce((sum, b) => sum + b.area, 0), [allBuildings]);

  const handleOrderProject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!house.userEmail.trim()) {
      alert(t.emailWarning);
      return;
    }
    setIsOrdering(true);
    setOrderSuccess(false);
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const passportEl = hiddenCaptureRef.current?.querySelector('#passport-doc-root') as HTMLElement;
      const calcEl = hiddenCaptureRef.current?.querySelector('#calculation-doc-root') as HTMLElement;
      let pB, cB;
      if (passportEl) pB = await generatePDFBlob(passportEl, "Passport");
      if (calcEl) cB = await generatePDFBlob(calcEl, "Calculation");
      const success = await processProjectOrder({ house, passportBlob: pB, calculationBlob: cB });
      if (success) {
        setOrderSuccess(true);
        alert(house.lang === 'ru' ? "УСПЕХ!" : (house.lang === 'en' ? "SUCCESS!" : "СӘТТІ!"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsOrdering(false);
    }
  };

  const CompanyInfoBlock = () => (
    <div className="flex flex-col items-end gap-1 text-right bg-white/90 p-2 md:p-3 rounded-2xl border border-slate-100 shadow-sm">
      <img src={LOGO_URL} className="w-10 h-10 md:w-16 md:h-16 rounded-xl object-cover shadow-lg mb-1" alt="PH Logo" />
      <span className="text-[12px] md:text-[18px] font-black uppercase text-slate-900 tracking-[0.2em] leading-none mb-0.5">PH HOME</span>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-slate-900 font-black text-[8px] md:text-[11px] tracking-widest">+7 707 220 7261</span>
        <span className="text-[#3b82f6] font-black text-[8px] md:text-[11px] tracking-tighter lowercase border-b border-[#3b82f6]/20">ph.parametric@gmail.com</span>
      </div>
    </div>
  );

  const ExplicationBlock = ({ currentHouse }: { currentHouse: HouseState }) => (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
       <div className="flex flex-col items-center">
          <h4 className="text-[16px] font-black uppercase text-[#ff5f1f] text-center tracking-widest leading-tight">{t.explication}</h4>
          <div className="flex items-center gap-1.5 mt-1.5 px-4 py-1 bg-slate-50 rounded-full border border-slate-100">
             <span className="text-[9px] font-black uppercase text-slate-400">{t.totalArea}:</span>
             <span className="text-[12px] font-black text-slate-900">{(currentHouse.houseWidth * currentHouse.houseLength * currentHouse.floors).toFixed(1)} м²</span>
          </div>
       </div>
       <div className="space-y-8">
          {currentHouse.calculatedPlan?.map(floor => (
            <div key={floor.floorNumber} className="space-y-3">
              <div className="flex justify-between items-end border-b pb-1 border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400">{currentHouse.lang === 'ru' ? 'Этаж' : (currentHouse.lang === 'en' ? 'Floor' : 'Қабат')} {floor.floorNumber}</span>
                <span className="text-[11px] font-black text-slate-900">{(currentHouse.houseWidth * currentHouse.houseLength).toFixed(1)} м²</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                 {floor.rooms.map((room, idx) => (
                   <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                     <span className="truncate pr-4">{room.name}</span>
                     <span className="flex-shrink-0">{room.area.toFixed(1)} м²</span>
                   </div>
                 ))}
              </div>
            </div>
          ))}
       </div>
    </div>
  );

  const PassportDocument = ({ currentHouse }: { currentHouse: HouseState }) => {
    const combinedDescription = [
      currentHouse.styleDescription,
      currentHouse.planningWishes,
      currentHouse.extraWishes
    ].filter(Boolean).join('. ');

    return (
      <div className="passport-doc bg-white p-8 md:p-16 flex flex-col gap-10 shadow-none border-none rounded-none min-h-screen overflow-hidden">
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
          <div className="space-y-1">
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 uppercase tracking-tighter leading-[0.85]">{t.passportTitle}</h1>
            <p className="text-[11px] md:text-[18px] font-bold text-[#ff5f1f] uppercase tracking-[0.4em] mt-4">{currentHouse.format === 'signature' ? 'PREMIUM SIGNATURE' : 'STANDARD ORDINARY'}</p>
            <div className="mt-10 grid grid-cols-2 gap-x-16 gap-y-4 text-[10px] md:text-[14px] font-bold text-slate-500 uppercase max-w-[650px]">
              <div className="flex justify-between border-b border-slate-100 py-2"><span>{t.projectNo}:</span> <span className="text-slate-900 font-black">{currentHouse.name}</span></div>
              <div className="flex justify-between border-b border-slate-100 py-2"><span>{t.client}:</span> <span className="text-slate-900 font-black">{currentHouse.userName}</span></div>
              <div className="flex justify-between border-b border-slate-100 py-2"><span>{t.phone}:</span> <span className="text-slate-900 font-black">{currentHouse.userPhone}</span></div>
              <div className="flex justify-between border-b border-slate-100 py-2"><span>Email:</span> <span className="text-slate-900 font-black lowercase">{currentHouse.userEmail || '---'}</span></div>
              <div className="col-span-2 flex gap-6 mt-6 text-[#ff5f1f] border-t-2 border-slate-50 pt-6"><span className="text-slate-400">{t.date}:</span> <span className="font-black text-slate-900">{currentHouse.projectDate}</span></div>
            </div>
          </div>
          <div className="flex-shrink-0 ml-8 md:ml-12">
             <CompanyInfoBlock />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-12">
          <div className="space-y-10">
            <div className="bg-slate-50 rounded-[32px] overflow-hidden shadow-inner border border-slate-100 relative min-h-[450px] flex items-center justify-center">
              {currentHouse.styleImageUrl ? (
                <img src={currentHouse.styleImageUrl} className="w-full h-auto max-h-[700px] object-contain" alt="Selected Style Visualization" />
              ) : (
                <div className="text-slate-300 text-[10px] uppercase font-black">{t.visual}</div>
              )}
              <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100">{t.visual}</div>
            </div>
            <div className="bg-slate-50 rounded-[32px] border border-slate-100 p-8 flex flex-col items-center justify-center relative shadow-sm overflow-hidden min-h-[400px]">
              <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100">{t.genplan}</div>
              {currentHouse.sitePlanUrl ? (
                <img src={currentHouse.sitePlanUrl} className="w-full h-full object-contain" alt="Site Plan" />
              ) : (
                <span className="text-slate-300 text-[10px] uppercase font-black">{t.genplan}</span>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden">
              <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">{t.planning.toUpperCase()}: {currentHouse.type.toUpperCase()}</h4>
              <div className="text-[13px] font-medium leading-relaxed italic text-slate-300 space-y-4">
                 <div>{combinedDescription || currentHouse.aiProjectDescription || "..."}</div>
              </div>
            </div>
            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <h4 className="text-[12px] font-black uppercase text-slate-900 mb-6 border-l-4 border-[#ff5f1f] pl-4 tracking-widest">{t.buildingsList}</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[12px] font-black text-slate-900 border-b border-slate-200 pb-2">
                  <span>{currentHouse.lang === 'ru' ? 'Участок' : (currentHouse.lang === 'en' ? 'Plot' : 'Учаске')} ({(currentHouse.plotWidth * currentHouse.plotLength / 100).toFixed(1)} {t.sotka.toLowerCase()})</span>
                  <span>{currentHouse.plotWidth}x{currentHouse.plotLength}м</span>
                </div>
                {allBuildings.map((b, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                    <span>{b.name}</span>
                    <span>{b.w.toFixed(1)}x{b.d.toFixed(1)}м ({b.area.toFixed(1)} м²)</span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-[12px] font-black text-[#ff5f1f] border-t border-slate-200 pt-3 mt-2">
                   <span>{t.totalBuildingsArea}:</span>
                   <span>{totalBuildingsArea.toFixed(1)} м²</span>
                </div>
              </div>
            </div>
            <ExplicationBlock currentHouse={house} />
          </div>
        </div>
      </div>
    );
  };

  const CalculationDocument = ({ currentHouse }: { currentHouse: HouseState }) => (
    <div className="calculation-doc bg-white p-8 md:p-12 flex flex-col gap-10 min-h-screen relative overflow-hidden shadow-none border-none rounded-none">
      <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t.conceptTitle}</h1>
          <p className="text-[10px] font-bold text-[#ff5f1f] uppercase tracking-[0.3em] mt-1">{t.investPassport}</p>
        </div>
        <CompanyInfoBlock />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-10">
          <div className="space-y-6">
            <h3 className="text-[14px] font-black uppercase text-slate-900 tracking-widest">{t.costDetails}</h3>
            <div className="space-y-4">
              <div className="bg-slate-900 p-5 rounded-[24px] text-white shadow-lg flex justify-between items-center">
                 <span className="text-[11px] font-black uppercase tracking-wider">{t.archPackage}</span>
                 <span className="text-[14px] font-black text-[#ff5f1f]">{costData.archPrice.toLocaleString()} ₸</span>
              </div>
              <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 flex justify-between items-center">
                 <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">{t.landscapePackage}</span>
                 <span className="text-[14px] font-black text-slate-900">{costData.landscapePrice.toLocaleString()} ₸</span>
              </div>
              <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 space-y-2">
                <span className="text-[11px] font-black uppercase text-slate-400 block border-b pb-1 mb-2">{t.additionalObjects}</span>
                {costData.objects.filter(o => o.active).map(obj => (
                  <div key={obj.id} className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                    <span>{obj.label}</span>
                    <span className="font-black">{obj.cost.toLocaleString()} ₸</span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">{t.grandTotal}</h4>
                <div className="flex items-baseline gap-2"><span className="text-4xl font-black tracking-tighter">{costData.grandTotal.toLocaleString()}</span><span className="text-[#ff5f1f] text-2xl font-black">₸</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="space-y-6">
            <h3 className="text-[14px] font-black uppercase text-slate-900 tracking-widest">{t.projectComposition}</h3>
            <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-6">
               <div className="space-y-2">
                  <h4 className="text-[12px] font-black uppercase text-[#ff5f1f]">{t.model}:</h4>
                  <p className="text-[11px] font-bold text-slate-700 leading-relaxed">- {t.modelDesc}</p>
               </div>
               <div className="space-y-3">
                  <h4 className="text-[12px] font-black uppercase text-[#ff5f1f]">{t.drawings}:</h4>
                  <ul className="space-y-1.5 ml-1">
                    {t.drawingList.map((item, i) => (<li key={i} className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-900" /><span className="text-[11px] font-bold text-slate-700">{item}</span></li>))}
                  </ul>
               </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-[40px] overflow-hidden relative shadow-2xl border-4 border-white aspect-[3/4] flex items-center justify-center group">
            <img src={MODEL_PHOTO_URL} className="w-full h-full object-cover" alt="Model" />
            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 shadow-lg">1:50</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (currentStep === 7) {
      return (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col items-center p-4 md:p-6 overflow-y-auto scrollbar-hide">
          <div className="max-w-4xl w-full flex flex-col gap-4 pb-20">
            <div className="flex justify-between items-center bg-white/90 backdrop-blur-xl p-3 rounded-[24px] shadow-lg border border-slate-100 sticky top-4 z-[510]">
              <button onClick={() => setCurrentStep(6)} className="px-5 py-2.5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 flex items-center gap-2">
                <i className="fas fa-arrow-left"></i> {t.back}
              </button>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleSavePDF(hiddenCaptureRef, "PROJECT_COST", "#calculation-doc-root"); }} disabled={isExporting} className="flex px-4 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 items-center gap-2">
                  <i className="fas fa-download"></i> {isExporting ? '...' : 'PDF'}
                </button>
                <button onClick={handleOrderProject} disabled={isOrdering} className={`px-6 py-2.5 ${orderSuccess ? 'bg-green-600' : 'bg-[#ff5f1f]'} text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all`}>
                  {isOrdering ? '...' : orderSuccess ? (house.lang === 'ru' ? 'ОТПРАВЛЕНО' : 'SENT') : t.orderProject}
                </button>
              </div>
            </div>
            <div id="calculation-doc-root" className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"><CalculationDocument currentHouse={house} /></div>
          </div>
        </div>
      );
    }

    if (currentStep === 6) {
      return (
        <div className="fixed inset-0 z-[500] bg-slate-100 flex flex-col items-center p-4 md:p-6 overflow-y-auto scrollbar-hide">
          <div className="max-w-5xl w-full flex flex-col gap-6 pb-24">
            <div className="flex justify-between items-center bg-white/90 backdrop-blur-xl p-4 rounded-[32px] shadow-xl border border-slate-200 sticky top-4 z-[510]">
              <button onClick={() => setCurrentStep(5)} className="px-6 py-3 text-[11px] font-black uppercase text-slate-400 hover:text-slate-900 flex items-center gap-3">
                <i className="fas fa-arrow-left"></i> {t.back}
              </button>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleSavePDF(hiddenCaptureRef, "ARCH_PASSPORT", "#passport-doc-root"); }} disabled={isExporting} className="flex px-5 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 items-center gap-2">
                  <i className="fas fa-download"></i> {isExporting ? '...' : 'PDF'}
                </button>
                <button onClick={() => setCurrentStep(7)} className="px-8 py-3 bg-[#ff5f1f] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                  {t.viewCost} <i className="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            </div>
            <div id="passport-doc-root" className="bg-white rounded-[40px] shadow-2xl overflow-hidden"><PassportDocument currentHouse={house} /></div>
          </div>
        </div>
      );
    }

    return (
      <div 
        ref={panelRef}
        className={`fixed bottom-0 md:inset-y-0 right-0 w-full md:w-[400px] lg:w-[480px] pointer-events-none p-4 md:p-6 flex flex-col gap-2 z-[400] transition-transform duration-500 ${!isMobileExpanded ? 'translate-y-[calc(100%-120px)] md:translate-y-0' : 'translate-y-0'}`}
        // Свайпы обрабатываем на всем контейнере
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Ручка свайпа (Drag Handle) */}
        <div 
          className="md:hidden w-full flex justify-center pt-2 pb-4 pointer-events-auto cursor-grab active:cursor-grabbing" 
          onClick={(e) => { e.stopPropagation(); setIsMobileExpanded(!isMobileExpanded); if(!isMobileExpanded) resetInactivityTimer(); }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-16 h-1.5 bg-slate-300 rounded-full shadow-inner" />
        </div>
        
        <div className="bg-white/95 backdrop-blur-3xl p-5 md:p-10 rounded-[40px] md:rounded-[56px] border border-slate-200 pointer-events-auto shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] flex flex-col gap-6 md:gap-10 overflow-y-auto max-h-[85vh] md:max-h-full scrollbar-hide">
          {/* Вкладки (Tabs) - теперь они тоже поддерживают свайп для управления панелью */}
          <div 
            className="flex justify-between items-center bg-slate-100/95 backdrop-blur-md p-1.5 rounded-[24px] overflow-x-auto scrollbar-hide shrink-0 z-10 sticky top-0 shadow-sm border border-slate-200/50"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {STEPS.slice(0, 6).map((step, i) => (
              <button key={step.id} onClick={(e) => toggleMobileStep(e, i)} className={`flex-1 py-3 px-2 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${i === currentStep ? 'bg-white shadow-md text-[#ff5f1f]' : 'text-slate-400 hover:text-slate-600'}`}>
                <i className={`fas ${step.icon} text-[12px] ${i === currentStep && !isMobileExpanded ? 'animate-pulse scale-110' : ''}`}></i>
                <span className="text-[7px] font-black uppercase text-center tracking-tighter">{step.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1" onPointerDown={(e) => { e.stopPropagation(); resetInactivityTimer(); }}>
            {currentStep === 0 && <div className="space-y-6">
              <button onClick={(e) => { e.stopPropagation(); onBackToWelcome?.(); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-[#ff5f1f] transition-colors mb-4 flex items-center gap-2">
                <i className="fas fa-undo"></i> {t.backToStyles}
              </button>
              <div className="flex items-center gap-3 mb-2"><i className="fas fa-chevron-right text-[#ff5f1f] text-sm"></i><div className="text-[12px] font-black uppercase text-[#ff5f1f] tracking-widest">{t.plotParams}</div></div>
              <div className="bg-orange-50 p-6 rounded-[32px] flex flex-col items-center gap-1 border border-orange-100 shadow-sm mb-6">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t.plotArea}</span>
                <span className="text-[#ff5f1f] font-black text-2xl tracking-tighter">{(house.plotWidth * house.plotLength / 100).toFixed(1)} {t.sotka.toUpperCase()}</span>
              </div>
              <Slider label={t.width} value={house.plotWidth} min={10} max={100} onChange={(v: number) => setHouse(p => ({...p, plotWidth: v}))} />
              <Slider label={t.length} value={house.plotLength} min={10} max={150} onChange={(v: number) => setHouse(p => ({...p, plotLength: v}))} />
            </div>}
            
            {currentStep === 1 && <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2"><i className="fas fa-chevron-right text-[#ff5f1f] text-sm"></i><div className="text-[14px] font-black uppercase text-[#ff5f1f] tracking-widest">{t.houseParams}</div></div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-slate-50 p-5 rounded-[28px] flex flex-col items-center border border-slate-100 shadow-sm"><span className="text-[8px] font-black uppercase text-slate-400">{t.totalArea}</span><span className="text-slate-900 font-black text-lg">{totalHouseArea.toFixed(0)} м²</span></div>
                 <div className="bg-slate-50 p-5 rounded-[28px] flex flex-col items-center border border-slate-100 shadow-sm"><span className="text-[8px] font-black uppercase text-slate-400">{t.floorArea}</span><span className="text-slate-900 font-black text-lg">{areaPerFloor.toFixed(0)} м²</span></div>
              </div>
              <Slider label={t.width} value={house.houseWidth} min={4} max={house.plotWidth-6} onChange={(v: number) => setHouse(p => ({...p, houseWidth: v}))} />
              <Slider label={t.length} value={house.houseLength} min={4} max={house.plotLength-6} onChange={(v: number) => setHouse(p => ({...p, houseLength: v}))} />
              <div className="flex bg-slate-50 p-1.5 rounded-[24px] border border-slate-100 gap-1">
                {[1, 2, 3].map(n => (<button key={n} onClick={(e) => { e.stopPropagation(); setHouse(p => ({...p, floors: n})); resetInactivityTimer(); }} className={`flex-1 py-4 rounded-[20px] font-black text-[11px] transition-all uppercase tracking-wider ${house.floors === n ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}>{n} {t.floors}</button>))}
              </div>
            </div>}

            {currentStep === 2 && (
              <div className="space-y-8">
                 <div className="flex flex-col gap-1 mb-4"><div className="flex items-center gap-3"><i className="fas fa-chevron-right text-[#ff5f1f] text-sm"></i><div className="text-[14px] font-black uppercase text-[#ff5f1f] tracking-widest">{t.planning}</div></div><p className="text-[9px] font-bold text-slate-400 uppercase ml-7">{t.planningSub}</p></div>
                 <div className="flex gap-2 mb-4">
                    <button onClick={() => handleSelectLivingFormat('ordinary')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${house.format === 'ordinary' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>{t.ordinary}</button>
                    <button onClick={() => handleSelectLivingFormat('signature')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${house.format === 'signature' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{t.premium}</button>
                 </div>
                 <div className="space-y-3">
                    <Toggle label={t.openSpace} checked={house.isKitchenLivingCombined} onChange={(v: boolean) => { setHouse(p => ({...p, isKitchenLivingCombined: v})); resetInactivityTimer(); }} />
                    <Toggle label={t.office} checked={house.hasOffice} onChange={(v: boolean) => { setHouse(p => ({...p, hasOffice: v})); resetInactivityTimer(); }} />
                    <div className="mt-4 px-1"><input type="text" value={house.planningWishes} onFocus={(e) => e.stopPropagation()} onChange={e => { setHouse(p => ({...p, planningWishes: e.target.value})); resetInactivityTimer(); }} placeholder={t.planningWishes} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[16px] font-bold outline-none focus:border-[#ff5f1f] shadow-inner" /></div>
                 </div>
                 <div className="bg-[#0f172a] p-6 rounded-[32px] space-y-4 shadow-2xl mt-6">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3"><h4 className="text-[11px] font-black uppercase text-slate-200 tracking-widest">{t.explication}</h4><span className="text-[12px] font-black text-[#ff5f1f]">{totalHouseArea.toFixed(0)} м²</span></div>
                    <div className="space-y-6 max-h-[320px] overflow-y-auto pr-2 scrollbar-hide">
                       {house.calculatedPlan?.map(floor => (
                         <div key={floor.floorNumber} className="space-y-1.5">
                            <div className="flex justify-between items-center border-b border-slate-800/50 pb-1 mb-1"><span className="text-[10px] font-black text-white uppercase tracking-wider">{house.lang === 'ru' ? 'Этаж' : (house.lang === 'en' ? 'Floor' : 'Қабат')} {floor.floorNumber}</span><span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{areaPerFloor.toFixed(0)} м²</span></div>
                            {floor.rooms.map((room, idx) => (<div key={idx} className="flex justify-between text-[10px] font-bold text-slate-400 hover:text-slate-100 transition-colors"><span>{room.name}</span><span className="text-white">{room.area.toFixed(1)} м²</span></div>))}
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            )}

            {currentStep === 3 && <div className="space-y-8">
               <div className="flex flex-col gap-1 mb-4"><div className="flex items-center gap-3"><i className="fas fa-chevron-right text-[#ff5f1f] text-sm"></i><div className="text-[14px] font-black uppercase text-[#ff5f1f] tracking-widest">{t.objects}</div></div><p className="text-[9px] font-bold text-slate-400 uppercase ml-7">{t.objectsSub}</p></div>
               <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                 <div className="space-y-2">
                    <Toggle label={t.terrace} checked={house.hasTerrace} onChange={(v: boolean) => { setHouse(p => ({...p, hasTerrace: v})); resetInactivityTimer(); }} />
                    {house.hasTerrace && (
                        <div className="bg-slate-50 p-4 rounded-3xl space-y-2">
                            <Slider label={t.width} value={house.terraceWidth} min={2} max={15} onChange={(v: number) => { setHouse(p => ({...p, terraceWidth: v})); resetInactivityTimer(); }} />
                            <Slider label={t.depth} value={house.terraceDepth} min={2} max={10} onChange={(v: number) => { setHouse(p => ({...p, terraceDepth: v})); resetInactivityTimer(); }} />
                        </div>
                    )}
                 </div>
                 <div className="space-y-2">
                    <Toggle label={t.pool} checked={house.hasPool} onChange={(v: boolean) => { setHouse(p => ({...p, hasPool: v})); resetInactivityTimer(); }} />
                    {house.hasPool && (
                        <div className="bg-slate-50 p-4 rounded-3xl space-y-2">
                            <Slider label={t.width} value={house.poolWidth} min={3} max={15} onChange={(v: number) => { setHouse(p => ({...p, poolWidth: v})); resetInactivityTimer(); }} />
                            <Slider label={t.depth} value={house.poolDepth} min={2} max={10} onChange={(v: number) => { setHouse(p => ({...p, poolDepth: v})); resetInactivityTimer(); }} />
                        </div>
                    )}
                 </div>
                 <div className="space-y-2">
                    <Toggle label={t.bath} checked={house.hasBath} onChange={(v: boolean) => { setHouse(p => ({...p, hasBath: v})); resetInactivityTimer(); }} />
                    {house.hasBath && (
                        <div className="bg-slate-50 p-4 rounded-3xl space-y-2">
                            <Slider label={t.width} value={house.bathWidth} min={3} max={10} onChange={(v: number) => { setHouse(p => ({...p, bathWidth: v})); resetInactivityTimer(); }} />
                            <Slider label={t.depth} value={house.bathDepth} min={3} max={10} onChange={(v: number) => { setHouse(p => ({...p, bathDepth: v})); resetInactivityTimer(); }} />
                        </div>
                    )}
                 </div>
                 <div className="space-y-2">
                    <Toggle label={t.bbq} checked={house.hasBBQ} onChange={(v: boolean) => { setHouse(p => ({...p, hasBBQ: v})); resetInactivityTimer(); }} />
                    {house.hasBBQ && (
                        <div className="bg-slate-50 p-4 rounded-3xl space-y-2">
                            <Slider label={t.width} value={house.bbqWidth} min={2} max={10} onChange={(v: number) => { setHouse(p => ({...p, bbqWidth: v})); resetInactivityTimer(); }} />
                            <Slider label={t.depth} value={house.bbqDepth} min={2} max={10} onChange={(v: number) => { setHouse(p => ({...p, bbqDepth: v})); resetInactivityTimer(); }} />
                        </div>
                    )}
                 </div>
                 <div className="space-y-2">
                    <Toggle label={t.hozblock} checked={house.hasCustomObj} onChange={(v: boolean) => { setHouse(p => ({...p, hasCustomObj: v})); resetInactivityTimer(); }} />
                    {house.hasCustomObj && (
                        <div className="bg-slate-50 p-4 rounded-3xl space-y-2">
                            <Slider label={t.width} value={house.customObjWidth} min={1} max={10} onChange={(v: number) => { setHouse(p => ({...p, customObjWidth: v})); resetInactivityTimer(); }} />
                            <Slider label={t.depth} value={house.customObjDepth} min={1} max={10} onChange={(v: number) => { setHouse(p => ({...p, customObjWidth: v})); resetInactivityTimer(); }} />
                        </div>
                    )}
                 </div>
               </div>
            </div>}

            {currentStep === 4 && <div className="space-y-8">
               <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center border-b border-slate-100 pb-2">{t.parking}</div>
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Toggle label={t.garage} checked={house.hasGarage} onChange={(v: boolean) => { setHouse(p => ({...p, hasGarage: v})); resetInactivityTimer(); }} />
                   {house.hasGarage && (<div className="bg-slate-50 p-4 rounded-3xl space-y-4"><div className="flex gap-2">{[1, 2, 3].map(n => (<button key={n} onClick={(e) => { e.stopPropagation(); setHouse(p => ({...p, garageCars: n})); resetInactivityTimer(); }} className={`flex-1 py-2 rounded-xl text-[9px] font-black ${house.garageCars === n ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400'}`}>{n} {t.cars}</button>))}</div><button onClick={(e) => { e.stopPropagation(); setHouse(p => ({...p, garageRotation: p.garageRotation === 0 ? Math.PI/2 : 0})); resetInactivityTimer(); }} className="w-full py-3 bg-white rounded-xl text-[9px] font-black uppercase border border-slate-200 hover:bg-slate-50"><i className="fas fa-redo mr-2"></i>{t.rotate}</button></div>)}
                 </div>
                 <div className="space-y-2">
                   <Toggle label={t.carport} checked={house.hasCarport} onChange={(v: boolean) => { setHouse(p => ({...p, hasCarport: v})); resetInactivityTimer(); }} />
                   {house.hasCarport && (<div className="bg-slate-50 p-4 rounded-3xl space-y-4"><div className="flex gap-2">{[1, 2, 3].map(n => (<button key={n} onClick={(e) => { e.stopPropagation(); setHouse(p => ({...p, carportCars: n})); resetInactivityTimer(); }} className={`flex-1 py-2 rounded-xl text-[9px] font-black ${house.carportCars === n ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400'}`}>{n} {t.cars}</button>))}</div><button onClick={(e) => { e.stopPropagation(); setHouse(p => ({...p, carportRotation: p.carportRotation === 0 ? Math.PI/2 : 0})); resetInactivityTimer(); }} className="w-full py-3 bg-white rounded-xl text-[9px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all"><i className="fas fa-redo mr-2"></i>{t.rotate}</button></div>)}
                 </div>
               </div>
            </div>}

            {currentStep === 5 && <div className="space-y-8">
               <div className="flex flex-col gap-1 mb-4"><div className="flex items-center gap-3"><i className="fas fa-chevron-right text-[#ff5f1f] text-sm"></i><div className="text-[14px] font-black uppercase text-[#ff5f1f] tracking-widest">{t.finish}</div></div><p className="text-[9px] font-bold text-slate-400 uppercase ml-7">{t.finishSub}</p></div>
               <div className="space-y-4">
                  <div onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="w-full h-24 bg-orange-50/30 border-2 border-dashed border-orange-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50 transition-all shadow-sm"><i className="fas fa-cloud-upload-alt text-[#ff5f1f] text-2xl mb-1"></i><span className="text-[9px] font-black uppercase text-[#ff5f1f]">{t.attachFiles}</span><input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" /></div>
                  
                  {house.projectFiles.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-3xl space-y-3 border border-slate-100 shadow-inner">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2"><i className="fas fa-paperclip"></i> {t.uploadedFiles}</span>
                      <div className="space-y-1.5">
                        {house.projectFiles.map((file, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-50 shadow-sm group">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <i className="fas fa-file text-[#ff5f1f]"></i>
                              <span className="truncate max-w-[200px]">{file.name}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setHouse(p => ({...p, projectFiles: p.projectFiles.filter((_, i) => i !== idx)})); resetInactivityTimer(); }} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea value={house.extraWishes} onFocus={(e) => e.stopPropagation()} onChange={e => { setHouse(p => ({...p, extraWishes: e.target.value})); resetInactivityTimer(); }} placeholder={t.extraInfo} className="w-full h-12 bg-slate-50 border border-slate-100 rounded-3xl p-4 text-[16px] font-bold outline-none focus:border-[#ff5f1f] shadow-inner resize-none" />
                  <input type="email" value={house.userEmail} onFocus={(e) => e.stopPropagation()} onChange={e => { setHouse(p => ({...p, userEmail: e.target.value})); resetInactivityTimer(); }} placeholder={t.emailPlaceholder} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-[16px] font-bold outline-none focus:border-[#ff5f1f] shadow-inner" />
                  <div className="flex flex-col gap-3 pt-2">
                    <button onClick={(e) => { e.stopPropagation(); handleGoToPassport(); }} className="w-full py-5 bg-slate-900 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><i className="fas fa-file-signature text-[#ff5f1f]"></i> {t.viewPassport}</button>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentStep(7); }} className="w-full py-5 bg-white border border-slate-900 text-slate-900 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><i className="fas fa-file-invoice-dollar text-[#ff5f1f]"></i> {t.viewCost}</button>
                    <div className="flex flex-col gap-1">
                      <button onClick={handleOrderProject} disabled={isOrdering} className={`w-full py-5 ${orderSuccess ? 'bg-green-600' : 'bg-orange-500'} text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 mt-2 ${isOrdering ? 'opacity-70 cursor-wait' : ''}`}>{isOrdering ? '...' : orderSuccess ? (house.lang === 'ru' ? 'ОТПРАВЛЕНО' : 'SENT') : t.orderProject}</button>
                      {!house.userEmail.trim() && !orderSuccess && <p className="text-red-500 text-[10px] font-black text-center mt-1 uppercase tracking-tighter leading-tight">{t.emailWarning}</p>}
                    </div>
                  </div>
               </div>
            </div>}
          </div>

          {currentStep < 5 && (
            <div className="mt-auto pt-6 flex flex-col gap-3 shrink-0 bg-white/80 sticky bottom-0 border-t border-slate-100">
               <button onClick={(e) => { e.stopPropagation(); setCurrentStep(currentStep + 1); setIsMobileExpanded(false); }} className="w-full py-5 bg-[#0f172a] text-white rounded-[24px] text-[12px] font-black uppercase tracking-widest hover:bg-[#ff5f1f] transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95">{t.continue} <i className="fas fa-chevron-right text-[8px]"></i></button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div ref={hiddenCaptureRef} className="fixed top-0 left-0 w-[1400px] pointer-events-none z-[-1000]" style={{ opacity: 0.01, pointerEvents: 'none' }}>
        <div style={{ background: 'white', padding: '20px' }}>
          <div id="passport-doc-root"><PassportDocument currentHouse={house} /></div>
          <div style={{ height: '100px' }} />
          <div id="calculation-doc-root"><CalculationDocument currentHouse={house} /></div>
        </div>
      </div>
      {renderContent()}
    </>
  );
};

const Slider = ({ label, value, min, max, step = 0.5, onChange }: any) => (
  <div className="space-y-2" onPointerDown={(e) => e.stopPropagation()}>
    <div className="flex justify-between items-baseline"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{label}</span><span className="text-[#ff5f1f] font-black text-xs">{value}м</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded-full appearance-none accent-[#ff5f1f] cursor-pointer" />
  </div>
);

const Toggle = ({ label, checked, onChange }: any) => (
  <button onClick={(e) => { e.stopPropagation(); onChange(!checked); }} className={`flex items-center justify-between p-5 rounded-[24px] w-full transition-all border-2 ${checked ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white text-slate-900 border-slate-100'}`}>
    <span className="text-[12px] font-black uppercase tracking-widest leading-none">{label}</span>
    <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-[#ff5f1f]' : 'bg-slate-200'}`}><div className={`absolute top-1 bottom-1 w-3 rounded-full bg-white transition-all ${checked ? 'right-1' : 'left-1'}`} /></div>
  </button>
);

export default Controls;
