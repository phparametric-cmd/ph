
import React, { useState, useRef, useMemo } from 'react';
import Scene from './components/Scene';
import Controls from './components/Controls';
import WelcomeScreen from './components/WelcomeScreen';
import Assistant from './components/Assistant';
import { HouseState, Language } from './types';
import { getTranslation } from './services/i18n';

const LOGO_URL = "https://raw.githubusercontent.com/phparametric-cmd/ph/3a1686781dd89eb77cf6f7ca10c15c739ae48eff/Ph.jpeg";

const generateProjectID = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PH-${year}${month}-${random}`;
};

const getFormattedDate = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${d}.${m}.${y} | ${h}:${min}`;
};

const INITIAL_STATE: HouseState = {
  lang: 'ru',
  userName: "",
  userPhone: "",
  userEmail: "",
  name: generateProjectID(),
  description: "Stable PH HOME architectural framework.",
  type: "Modern Minimalism",
  format: "ordinary",
  styleDescription: "", 
  area: 120, 
  floors: 2,
  roofType: 'flat',
  wallColor: "#ffffff",
  roofColor: "#1e1e1e",
  doorColor: "#1e1e1e",
  plotWidth: 25, 
  plotLength: 40, 
  gatePosX: 0, 
  houseWidth: 12,
  houseLength: 10, 
  housePosX: 0,
  housePosZ: 5,
  bedroomsCount: 3,
  bedroomArea: 16,
  bathroomsCount: 2,
  hasOffice: false,
  hasPantry: true,
  isKitchenLivingCombined: true,
  floorComments: ["", "", ""],
  calculatedPlan: [],
  planningWishes: "",
  hasTerrace: false,
  terraceWidth: 6,
  terraceDepth: 4,
  terracePosX: 0,
  terracePosZ: -10,
  hasBBQ: false,
  bbqLabel: "Зона BBQ",
  bbqWidth: 3.5,
  bbqDepth: 3.5,
  bbqPosX: -8,
  bbqPosZ: -15,
  hasSummerKitchen: false,
  summerKitchenWidth: 6,
  summerKitchenDepth: 5,
  summerKitchenPosX: 10,
  summerKitchenPosZ: -12,
  hasBath: false,
  bathWidth: 6,
  bathDepth: 6,
  bathPosX: -10,
  bathPosZ: -10,
  hasPool: false,
  poolWidth: 8,
  poolDepth: 4,
  poolPosX: 8,
  poolPosZ: -8,
  hasJacuzzi: false,
  jacuzziWidth: 2.5,
  jacuzziDepth: 2.5,
  jacuzziPosX: -14,
  jacuzziPosZ: -16,
  hasGarage: false,
  garageCars: 1,
  garageWeight: 3.5,
  garageGateOpen: false,
  garagePosX: 10,
  garagePosZ: 15,
  garageRotation: 0,
  hasCarport: false,
  carportCars: 2,
  carportWeight: 2.5,
  carportPosX: -10,
  carportPosZ: 18,
  carportRotation: 0,
  hasCustomObj: false,
  customObjLabel: "Хозблок",
  customObjWidth: 4,
  customObjDepth: 3,
  customObjPosX: 0,
  customObjPosZ: -20,
  extraWishes: "",
  projectFiles: []
};

const App: React.FC = () => {
  const [house, setHouse] = useState<HouseState>(INITIAL_STATE);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [customAssistantMsg, setCustomAssistantMsg] = useState<{ title: string, text: string } | undefined>(undefined);
  const captureRef = useRef<((mode?: 'current' | 'top') => string) | null>(null);

  const t = getTranslation(house.lang);

  const handleStart = (config: Partial<HouseState>) => {
    setHouse(prev => ({ ...prev, ...config, projectDate: getFormattedDate() }));
    setHasStarted(true);
  };

  const handleBackToWelcome = () => {
    setHasStarted(false);
    setCurrentStep(0);
    setHouse(prev => ({ ...INITIAL_STATE, name: generateProjectID(), lang: prev.lang }));
  };

  const changeLang = (lang: Language) => {
    setHouse(prev => ({ ...prev, lang }));
  };

  const plotAreaSotka = (house.plotWidth * house.plotLength) / 100;
  const totalHouseArea = house.houseWidth * house.houseLength * house.floors;

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden select-none touch-none md:touch-auto">
      {!hasStarted ? (
        <>
          <WelcomeScreen onStart={handleStart} existingData={house} onLangChange={changeLang} />
          <Assistant step={-1} isWelcome={true} lang={house.lang} />
        </>
      ) : (
        <>
          <Scene 
            house={house} setHouse={setHouse}
            showHouse={currentStep > 0} 
            isStyleStep={true}
            currentStep={currentStep}
            onCaptureRef={captureRef}
          />
          <Controls 
            house={house} setHouse={setHouse} 
            currentStep={currentStep} setCurrentStep={setCurrentStep} 
            onCaptureRef={captureRef}
            onBackToWelcome={handleBackToWelcome}
            onSetAssistantMsg={setCustomAssistantMsg}
          />
          <Assistant step={currentStep} customMessage={customAssistantMsg} lang={house.lang} />
          
          <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-3 z-[450]">
            <div className="flex items-center justify-between bg-white/40 p-1.5 rounded-lg backdrop-blur-sm pointer-events-auto">
               <div className="flex items-center gap-1.5">
                 <img src={LOGO_URL} className="w-6 h-6 md:w-8 md:h-8 rounded shadow-sm object-cover" alt="PH Logo" />
                 <div className="flex flex-col">
                    <span className="text-[#1e1e1e] font-black text-[9px] md:text-[12px] tracking-tighter uppercase leading-none">PH HOME</span>
                    <span className="text-slate-400 text-[4px] md:text-[6px] font-bold uppercase tracking-widest md:tracking-[0.3em] mt-0.5">Architecture</span>
                 </div>
               </div>
               <div className="ml-4 flex gap-1">
                 {(['ru', 'en', 'kk'] as Language[]).map(l => (
                   <button 
                     key={l}
                     onClick={() => changeLang(l)}
                     className={`px-1.5 py-0.5 rounded text-[8px] font-black ${house.lang === l ? 'bg-slate-900 text-white' : 'bg-white/50 text-slate-400'}`}
                   >
                     {l === 'kk' ? 'KZ' : l.toUpperCase()}
                   </button>
                 ))}
               </div>
            </div>

            <div className="hidden md:flex bg-white/80 backdrop-blur-xl p-2 md:p-4 rounded-xl md:rounded-[24px] border border-slate-100 flex-col gap-1 md:gap-2 shadow-lg pointer-events-none">
              <div className="flex items-center gap-3 md:gap-6">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[4px] md:text-[6px] font-black uppercase">{t.projectNo}</span>
                  <span className="text-[#1e1e1e] text-[7px] md:text-[10px] font-black truncate max-w-[60px] md:max-w-[120px]">{house.name}</span>
                </div>
                <div className="w-[1px] h-3 md:h-6 bg-slate-200" />
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[4px] md:text-[6px] font-black uppercase">{t.client}</span>
                  <span className="text-[#1e1e1e] text-[7px] md:text-[10px] font-black truncate max-w-[60px] md:max-w-[100px]">{house.userName || '---'}</span>
                </div>
                <div className="w-[1px] h-3 md:h-6 bg-slate-200" />
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[4px] md:text-[6px] font-black uppercase">{t.phone}</span>
                  <span className="text-[#1e1e1e] text-[7px] md:text-[10px] font-black">{house.userPhone || '---'}</span>
                </div>
              </div>
              <div className="w-full h-[1px] bg-slate-100" />
              <div className="flex items-center gap-3 md:gap-6">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[4px] md:text-[6px] font-black uppercase">{t.totalArea}</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[#1e1e1e] text-[8px] md:text-xs font-black">{totalHouseArea.toFixed(0)}</span>
                    <span className="text-[#ff5f1f] font-black text-[6px] md:text-[8px]">M²</span>
                  </div>
                </div>
                <div className="w-[1px] h-3 md:h-6 bg-slate-200" />
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[4px] md:text-[6px] font-black uppercase">{t.plotArea}</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[#1e1e1e] text-[8px] md:text-xs font-black">{plotAreaSotka.toFixed(1)}</span>
                    <span className="text-[#ff5f1f] font-black text-[6px] md:text-[8px] uppercase">{t.sotka}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
