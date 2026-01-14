
import React, { useState, useRef } from 'react';
import { HouseState, HouseType, Language } from '../types';
import { getTranslation } from '../services/i18n';

interface WelcomeScreenProps {
  onStart: (initialConfig: Partial<HouseState>) => void;
  existingData?: Partial<HouseState>;
  onLangChange: (lang: Language) => void;
}

const LOGO_URL = "https://raw.githubusercontent.com/phparametric-cmd/ph/3a1686781dd89eb77cf6f7ca10c15c739ae48eff/Ph.jpeg";

const STYLES: { type: HouseType; label: string; description: string; image: string; colors: any }[] = [
  { 
    type: 'Modern Minimalism', 
    label: 'MINIMALISM', 
    description: 'Чистые линии, панорамное остекление и максимум свободного пространства. Философия комфорта через простоту.',
    image: 'https://raw.githubusercontent.com/phparametric-cmd/ph/0cc86e105a5cb0cd8fdc0071139b1e5ad51cd924/%D1%81%D0%BE%D0%B2%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D0%BC%D0%B8%D0%BD%D0%B8%D0%BC%D0%B0%D0%BB%D0%B8%D0%B7%D0%BC%20.jpeg',
    colors: { wall: "#ffffff", roof: "#0f172a", roofType: "flat", door: "#1e1e1e" }
  },
  { 
    type: 'Modern Classics', 
    label: 'CLASSICS', 
    description: 'Симметрия, изысканные фасадные элементы и вневременная элегантность. Сочетание традиций и современных технологий.',
    image: 'https://raw.githubusercontent.com/phparametric-cmd/ph/760dc73689ca781952b348fbb0f8e4d02027b9e7/Classical%20.jpeg',
    colors: { wall: "#f8fafc", roof: "#334155", roofType: "hipped", door: "#1e1b4b" }
  },
  { 
    type: 'Wright Style', 
    label: 'WRIGHT', 
    description: 'Органическая архитектура с выраженными горизонтальными линиями и широкими свесами кровли. Единство дома и ландшафта.',
    image: 'https://raw.githubusercontent.com/phparametric-cmd/ph/760dc73689ca781952b348fbb0f8e4d02027b9e7/%D0%A0%D0%B0%D0%B9%D1%82%20.jpeg',
    colors: { wall: "#a8a29e", roof: "#451a03", roofType: "hipped", door: "#1e1e1e" }
  },
  { 
    type: 'Industrial', 
    label: 'INDUSTRIAL', 
    description: 'Грубые фактуры, открытые конструктивные элементы и лофт-эстетика. Стиль для смелых и неординарных решений.',
    image: 'https://raw.githubusercontent.com/phparametric-cmd/ph/0cc86e105a5cb0cd8fdc0071139b1e5ad51cd924/%D0%A1%D0%BE%D0%B2%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D0%B4%D0%BE%D0%BC.jpeg',
    colors: { wall: "#94a3b8", roof: "#1e1e1e", roofType: "flat", door: "#000" }
  }
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, existingData, onLangChange }) => {
  const currentLang = existingData?.lang || 'ru';
  const t = getTranslation(currentLang);

  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
  const [selectedType, setSelectedType] = useState<HouseType>(existingData?.type || 'Modern Minimalism');
  const [userName, setUserName] = useState(existingData?.userName || '');
  const [userPhone, setUserPhone] = useState(existingData?.userPhone || '');
  
  const [customStyleImage, setCustomStyleImage] = useState<string | undefined>(existingData?.customStyleImage);
  const [customStyleDesc, setCustomStyleDesc] = useState(existingData?.styleDescription || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    let digits = val.replace(/\D/g, '');
    setUserPhone(digits ? '+' + digits : '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCustomStyleImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleStart = () => {
    if (!userName.trim() || userPhone.length < 8) return;
    
    const styleData = activeTab === 'custom' 
      ? {
          type: 'Custom' as HouseType,
          styleDescription: customStyleDesc,
          customStyleImage: customStyleImage,
          styleImageUrl: customStyleImage,
          wallColor: "#e2e8f0",
          roofColor: "#334155",
          roofType: "flat" as const,
          doorColor: "#1e293b"
        }
      : {
          type: selectedType,
          styleDescription: STYLES.find(s => s.type === selectedType)?.description || "",
          styleImageUrl: STYLES.find(s => s.type === selectedType)?.image,
          wallColor: STYLES.find(s => s.type === selectedType)?.colors.wall,
          roofColor: STYLES.find(s => s.type === selectedType)?.colors.roof,
          roofType: STYLES.find(s => s.type === selectedType)?.colors.roofType,
          doorColor: STYLES.find(s => s.type === selectedType)?.colors.door,
        };

    onStart({
      userName,
      userPhone,
      ...styleData
    });
  };

  const isFormValid = userName.length > 1 && userPhone.length > 7 && (activeTab === 'preset' || (customStyleDesc.length > 5));

  return (
    <div className="fixed inset-0 z-[300] bg-white flex flex-col font-sans overflow-y-auto scrollbar-hide">
      <nav className="w-full px-4 md:px-12 py-3 flex justify-between items-center bg-white border-b border-slate-50 relative z-10">
        <div className="flex items-center gap-2">
           <img src={LOGO_URL} className="w-6 h-6 rounded shadow-sm object-cover" alt="PH Logo" />
           <span className="font-black text-[9px] uppercase tracking-widest text-slate-900 leading-none">PH HOME</span>
        </div>
        <div className="flex gap-2">
           {(['ru', 'en', 'kk'] as Language[]).map(l => (
             <button 
               key={l}
               onClick={() => onLangChange(l)}
               className={`px-2 py-1 rounded text-[10px] font-black transition-all ${currentLang === l ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
             >
               {l === 'kk' ? 'KZ' : l.toUpperCase()}
             </button>
           ))}
        </div>
      </nav>

      <main className="flex-1 max-w-[1720px] mx-auto w-full px-4 md:px-12 py-6 grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-8 items-start relative z-10">
        <div className="space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left">
           <div className="space-y-2">
              <h1 className="text-2xl md:text-5xl font-black text-slate-900 leading-tight tracking-tighter">{t.welcome.split(' ').slice(0,-1).join(' ')} <span className="text-[#ff5f1f]">{t.welcome.split(' ').pop()}</span></h1>
              <p className="text-slate-400 text-[10px] md:text-[13px] font-medium max-w-[280px] mx-auto lg:mx-0">{t.subWelcome}</p>
           </div>

           <div className="space-y-3 w-full max-w-[280px]">
              <div className="space-y-2">
                 <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder={t.namePlaceholder} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5 text-[16px] focus:border-[#ff5f1f] outline-none font-bold" />
                 <input type="tel" value={userPhone} onChange={handlePhoneChange} placeholder={t.phonePlaceholder} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5 text-[16px] focus:border-[#ff5f1f] outline-none font-bold" />
              </div>
              <button onClick={handleStart} disabled={!isFormValid} className={`w-full py-3 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all shadow-lg ${!isFormValid ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-[#ff5f1f]'}`}>
                {t.createProject}
              </button>
           </div>
        </div>

        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex gap-8 border-b border-slate-100">
            <button onClick={() => setActiveTab('preset')} className={`pb-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'preset' ? 'text-slate-900' : 'text-slate-300'}`}>
              {t.readyStyles} {activeTab === 'preset' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff5f1f]" />}
            </button>
            <button onClick={() => setActiveTab('custom')} className={`pb-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'custom' ? 'text-slate-900' : 'text-slate-300'}`}>
              {t.customRef} {activeTab === 'custom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff5f1f]" />}
            </button>
          </div>

          <div className="flex-1 py-2">
            {activeTab === 'preset' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {STYLES.map((style) => (
                  <button 
                    key={style.type} 
                    onClick={() => setSelectedType(style.type)} 
                    className={`group relative aspect-[16/9] md:aspect-[4/3] rounded-2xl md:rounded-[48px] overflow-hidden border-2 transition-all ${selectedType === style.type ? 'border-[#ff5f1f] scale-[1.01] shadow-2xl' : 'border-transparent opacity-80 hover:opacity-100'}`}
                  >
                    <img src={style.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={style.label} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/40 to-transparent flex flex-col justify-end p-6 md:p-12 text-left">
                      <h3 className="text-white text-[20px] md:text-[32px] font-black tracking-tighter uppercase mb-2 leading-none">{style.label}</h3>
                      <p className="text-slate-200 text-[9px] md:text-[13px] font-bold leading-relaxed max-w-[90%] md:max-w-[80%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
                        {style.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6">
                <div onClick={() => fileInputRef.current?.click()} className="aspect-video md:aspect-[4/5] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-slate-100">
                  {customStyleImage ? <img src={customStyleImage} className="w-full h-full object-contain rounded-2xl" /> : <div className="text-center"><i className="fas fa-camera text-[#ff5f1f] text-3xl mb-2"></i><span className="text-[10px] font-black uppercase block tracking-widest text-[#ff5f1f]">ЗАГРУЖЕННЫЕ ФОТО</span></div>}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>
                <div className="aspect-video md:aspect-auto bg-slate-50/50 rounded-2xl flex flex-col p-4 border border-slate-100">
                   <textarea value={customStyleDesc} onChange={e => setCustomStyleDesc(e.target.value)} placeholder={t.extraInfo} className="w-full flex-1 bg-transparent text-[16px] font-medium resize-none outline-none" />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default WelcomeScreen;
