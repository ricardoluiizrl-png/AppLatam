import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles, Globe, Plane, Video, Volume2, VolumeX } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
  userName?: string;
}

export default function SplashScreen({ onComplete, userName = "Agente LATAM" }: SplashScreenProps) {
  const [step, setStep] = useState<number>(1);
  const [videoUrl, setVideoUrl] = useState<string | null>(() => {
    return localStorage.getItem("latam_opening_video_url") || null;
  });
  const [isMuted, setIsMuted] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      try {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            localStorage.setItem("latam_opening_video_url", reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Erro ao salvar vídeo em base64:", err);
      }
    }
  };

  // Play a soft, pleasant LATAM airline chime using Web Audio API
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Two-tone soft chime (E5 -> A5)
      playTone(659.25, 0, 1.2);
      playTone(880.00, 0.25, 1.8);
    } catch {
      // Audio autoplay restrictions catch
    }
  };

  useEffect(() => {
    // Step 1: Ribbon swirl & logo formation (0s - 1.2s)
    // Step 2: LATAM AIRLINES logo text appears + sound chime (1.2s)
    // Step 3: World map and network flight routes fade in (2.2s)
    // Step 4: Tagline "Líder na América Latina" appears (3.4s)
    
    const timer1 = setTimeout(() => {
      setStep(2);
      playChime();
    }, 1200);

    const timer2 = setTimeout(() => setStep(3), 2200);
    
    const timer3 = setTimeout(() => {
      setStep(4);
    }, 3400);

    // Auto complete after 6 seconds if not manually clicked
    const timer4 = setTimeout(() => {
      onComplete();
    }, 6200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div 
      id="latam-splash-screen"
      className="fixed inset-0 z-50 bg-[#E3E8EC] flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* SPARKLE STARS IN BOTTOM RIGHT (FROM VIDEO) */}
      <div className="absolute bottom-6 right-6 pointer-events-none z-30 flex items-center gap-1.5 opacity-60">
        <motion.div
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-6 h-6 text-slate-400" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 0.7, 1], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <Sparkles className="w-4 h-4 text-slate-400" />
        </motion.div>
      </div>

      {/* BACKGROUND WORLD MAP & GLOBAL NETWORK FLIGHT ARCS */}
      <AnimatePresence>
        {step >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 0.45, scale: 1 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
          >
            <svg 
              className="w-full h-full max-w-6xl object-cover opacity-70" 
              viewBox="0 0 1000 600" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* World Continents Mesh Background */}
              <g fill="#9AAABC" opacity="0.25">
                {/* South America */}
                <path d="M 330,320 C 370,300 420,330 430,370 C 440,420 410,480 380,530 C 350,560 320,530 310,480 C 300,430 310,360 330,320 Z" />
                {/* North America */}
                <path d="M 200,120 C 270,100 360,130 370,190 C 350,240 280,270 230,260 C 180,240 160,170 200,120 Z" />
                {/* Europe */}
                <path d="M 520,130 C 580,120 630,150 630,190 C 600,230 540,240 510,210 C 490,180 500,140 520,130 Z" />
                {/* Africa */}
                <path d="M 540,250 C 600,260 630,320 620,380 C 580,430 530,420 510,360 C 500,310 520,260 540,250 Z" />
                {/* Asia */}
                <path d="M 660,140 C 760,130 850,180 840,250 C 800,300 710,300 660,260 C 630,220 640,160 660,140 Z" />
              </g>

              {/* Connecting Global Network Lines & Arcs */}
              <motion.path
                d="M 380,410 Q 300,220 280,180" // GRU to MIA
                stroke="#002A8F"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
              />
              <motion.path
                d="M 380,410 Q 500,280 570,170" // GRU to MAD
                stroke="#002A8F"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.8, delay: 0.2, ease: "easeInOut" }}
              />
              <motion.path
                d="M 380,410 Q 340,460 330,490" // GRU to SCL
                stroke="#E31837"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
              />
              <motion.path
                d="M 380,410 Q 350,350 340,330" // GRU to BOG
                stroke="#E31837"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
              />

              {/* Additional Global Inter-continental Arcs */}
              <motion.path
                d="M 330,490 Q 240,320 280,180" // SCL to MIA
                stroke="#8EA1B5"
                strokeWidth="1"
                strokeDasharray="2 2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
              />
              <motion.path
                d="M 280,180 Q 450,110 570,170" // MIA to MAD
                stroke="#8EA1B5"
                strokeWidth="1"
                strokeDasharray="2 2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.6, ease: "easeInOut" }}
              />

              {/* Hub Nodes (Airports) */}
              {/* Sao Paulo (GRU) - Central Hub */}
              <circle cx="380" cy="410" r="5" fill="#E31837" />
              <circle cx="380" cy="410" r="12" fill="#E31837" opacity="0.25">
                <animate attributeName="r" values="5;16;5" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="2.2s" repeatCount="indefinite" />
              </circle>

              {/* Santiago (SCL) */}
              <circle cx="330" cy="490" r="4" fill="#002A8F" />
              {/* Bogota (BOG) */}
              <circle cx="340" cy="330" r="4" fill="#002A8F" />
              {/* Miami (MIA) */}
              <circle cx="280" cy="180" r="4" fill="#002A8F" />
              {/* Madrid (MAD) */}
              <circle cx="570" cy="170" r="4" fill="#002A8F" />
              {/* Lima (LIM) */}
              <circle cx="320" cy="380" r="4" fill="#002A8F" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR: OPERATOR BADGE & VIDEO CUSTOMIZER */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="pt-8 px-6 md:px-12 w-full flex justify-between items-center z-20"
      >
        <div className="bg-white/85 backdrop-blur-md px-4 py-2 rounded-full border border-white shadow-sm flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-[#002A8F] tracking-wide">
            Operador Logado: <span className="text-slate-800">{userName}</span>
          </span>
        </div>

        {/* MP4 VIDEO UPLOADER CONTROL */}
        <div className="flex items-center gap-2">
          {videoUrl && (
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full border border-white/20 transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          )}
        </div>
      </motion.div>

      {/* CENTER ANIMATED LATAM LOGO & TEXT (RESPONSIVE PC/TABLET/MOBILE) */}
      <div className="my-auto flex flex-col items-center justify-center z-20 px-6 text-center w-full max-w-4xl mx-auto">
        
        {/* RESPONSIVE FLEX: VERTICAL ON MOBILE, HORIZONTAL ON DESKTOP/TABLET */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          
          {/* LOGO EMBLEM ANIMATION */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center justify-center"
          >
            <img 
              src="https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/adac6e864_Latam-logo-2.png" 
              alt="LATAM Emblem" 
              className="h-20 sm:h-24 md:h-28 w-auto object-contain drop-shadow-md select-none"
            />
          </motion.div>

          {/* LATAM AIRLINES TEXT */}
          <AnimatePresence>
            {step >= 2 && (
              <motion.div
                initial={{ opacity: 0, x: -10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center md:text-left"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-wider text-[#1B0088] uppercase font-sans leading-none">
                  LATAM
                </h1>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-[0.3em] text-[#1B0088] uppercase font-sans mt-1">
                  AIRLINES
                </h2>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TAGLINE BELOW "Líder na América Latina" */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="mt-8 md:mt-12 flex flex-col items-center"
            >
              <div className="w-16 h-0.5 bg-[#1B0088]/20 mb-3 rounded-full" />
              <p className="text-slate-700 text-base sm:text-lg font-serif italic tracking-wide">
                Líder na América Latina
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER ACTIONS / ACCESS BUTTON & PROGRESS */}
      <div className="pb-10 px-6 w-full max-w-md mx-auto z-20 flex flex-col items-center">
        {step >= 4 ? (
          <motion.button
            id="btn-splash-enter-main"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={onComplete}
            className="w-full py-4 px-8 bg-gradient-to-r from-[#E31837] via-[#002A8F] to-[#1B0088] hover:opacity-95 text-white font-extrabold rounded-2xl shadow-xl shadow-blue-950/20 text-sm tracking-wide flex items-center justify-center gap-3 cursor-pointer transition duration-200 border border-white/20"
          >
            <span>Acessar Conciliação de Bagagens</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        ) : (
          <div className="w-full space-y-2.5 text-center">
            <div className="w-full bg-slate-300/80 h-1.5 rounded-full overflow-hidden shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-[#E31837] to-[#1B0088]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5.5, ease: "linear" }}
              />
            </div>
            <span className="text-xs text-slate-600 font-semibold tracking-wide flex items-center justify-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#002A8F] animate-spin" />
              <span>Sincronizando rotas operacionais...</span>
            </span>
          </div>
        )}

        <div className="mt-4 text-[11px] text-slate-500 font-medium text-center">
          LATAM Airlines Group S.A. • Sistema de Conciliação de Bagagens
        </div>
      </div>
    </div>
  );
}

