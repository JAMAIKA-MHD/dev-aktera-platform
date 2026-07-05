import React, { useState, useEffect, useRef } from 'react';
import { BrandPreset, Prize } from '../types';
import { Sparkles, Play, Volume2, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface PlayerGameProps {
  activeBrand: BrandPreset;
  forcedOutcome: 'win' | 'lose' | 'random';
  onGameComplete: (wonPrize: Prize) => void;
  playerName: string;
}

export const PlayerGame: React.FC<PlayerGameProps> = ({
  activeBrand,
  forcedOutcome,
  onGameComplete,
  playerName,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ledFlash, setLedFlash] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Simple visual simulation of ticking sound using a light visual pulse
  const [tickerTick, setTickerTick] = useState(false);

  // Flash the outer decorative LED lights around the wheel
  useEffect(() => {
    const flashInterval = setInterval(() => {
      setLedFlash((prev) => !prev);
    }, 450);
    return () => clearInterval(flashInterval);
  }, []);

  // Helper to generate the SVG path for a circular pie slice
  const getSlicePath = (index: number, total: number, radius: number = 180) => {
    const angle = 360 / total;
    const startAngle = index * angle;
    const endAngle = (index + 1) * angle;

    const radStart = (startAngle - 90) * (Math.PI / 180);
    const radEnd = (endAngle - 90) * (Math.PI / 180);

    const x1 = 200 + radius * Math.cos(radStart);
    const y1 = 200 + radius * Math.sin(radStart);
    const x2 = 200 + radius * Math.cos(radEnd);
    const y2 = 200 + radius * Math.sin(radEnd);

    return `M 200 200 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  // Safe lazy play sound simulation using native browser synth (No external MP3 files needed!)
  const playTickSound = (frequency: number = 440, duration: number = 0.05) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio not supported or blocked by browser gesture
    }
  };

  const handleSpinClick = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    playTickSound(650, 0.1);

    // 1. Determine index of target prize based on forcedOutcome
    let eligibleIndices: number[] = [];
    if (forcedOutcome === 'win') {
      eligibleIndices = activeBrand.prizes
        .map((p, idx) => (p.isWin ? idx : -1))
        .filter((idx) => idx !== -1);
    } else if (forcedOutcome === 'lose') {
      eligibleIndices = activeBrand.prizes
        .map((p, idx) => (!p.isWin ? idx : -1))
        .filter((idx) => idx !== -1);
    }

    // Fallback if no matching prizes found, or if outcome is random
    if (eligibleIndices.length === 0) {
      eligibleIndices = activeBrand.prizes.map((_, idx) => idx);
    }

    const targetIdx = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];
    const targetPrize = activeBrand.prizes[targetIdx];

    // 2. Perform the spin mathematics (Pointer at top-center - 0 degrees / 12 o'clock)
    // To align center of target segment with top pointer, rotate by 360 - (idx * 60 + 30)
    const segmentAngle = 360 / activeBrand.prizes.length;
    const centerOffset = segmentAngle / 2;
    const prizeAngle = 360 - (targetIdx * segmentAngle + centerOffset);

    const spinRotations = 6; // Spin 6 full loops
    const finalRotation = spinRotations * 360 + prizeAngle;

    setWheelRotation(finalRotation);

    // Simulate sound ticks during high speed wheel rotation
    let speed = 40;
    const triggerTick = () => {
      if (speed > 800) return;
      playTickSound(450 + (1000 - speed) * 0.2, 0.02);
      setTickerTick((prev) => !prev);
      speed *= 1.15;
      setTimeout(triggerTick, speed);
    };
    setTimeout(triggerTick, 100);

    // 3. Complete spin after 4.2 seconds
    setTimeout(() => {
      setIsSpinning(false);
      playTickSound(880, 0.25);
      onGameComplete(targetPrize);
    }, 4200);
  };

  return (
    <div id="player-game-container" className="flex-1 flex flex-col px-6 py-6 justify-between h-full bg-[#0F0F1A] text-zinc-100 select-none">
      {/* Player greeting banner */}
      <div id="game-greeting-header" className="text-center pt-1">
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 font-mono uppercase">Active Player</p>
        <h3 className="text-sm font-bold text-zinc-200 truncate mt-0.5" style={{ color: activeBrand.primaryColor }}>
          👋 Saha {playerName || 'Player'}
        </h3>
        <p dir="auto" className="text-[11px] text-zinc-400 font-sans mt-0.5">
          بصحتك المشاركة! اضغط على الزر لتجرب حظك
        </p>
      </div>

      {/* CUSTOM DESIGN LUCKY WHEEL VIEWPORT */}
      <div id="wheel-viewport" className="flex-1 flex items-center justify-center py-4 relative overflow-hidden">
        {/* Neon decorative background grid glow */}
        <div 
          className="absolute w-72 h-72 rounded-full filter blur-[100px] opacity-20 transition-all duration-700"
          style={{ backgroundColor: activeBrand.primaryColor }}
        />

        {/* The Outer Wheel Rim wrapper with flashing LEDs */}
        <div 
          id="wheel-rim-wrapper"
          className="relative w-76 h-76 md:w-80 md:h-80 rounded-full bg-zinc-950 border-[6px] border-[#1A1A2A] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center p-2"
          style={{ boxShadow: `0 0 35px ${activeBrand.primaryColor}20` }}
        >
          {/* Slices container rotated dynamically */}
          <div 
            id="wheel-slices-container"
            className="w-full h-full rounded-full overflow-hidden relative"
            style={{ 
              transform: `rotate(${wheelRotation}deg)`,
              transition: isSpinning ? 'transform 4200ms cubic-bezier(0.12, 0.85, 0.15, 1)' : 'none'
            }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full">
              {/* Slices of the wheel */}
              {activeBrand.prizes.map((prize, idx) => {
                const total = activeBrand.prizes.length;
                const path = getSlicePath(idx, total);
                const angle = 360 / total;
                const midAngle = idx * angle + angle / 2 - 90;
                
                // Position text labels at center of slice
                const labelRadius = 110;
                const rad = midAngle * (Math.PI / 180);
                const tx = 200 + labelRadius * Math.cos(rad);
                const ty = 200 + labelRadius * Math.sin(rad);

                return (
                  <g key={idx}>
                    {/* SVG Segment Slice */}
                    <path 
                      d={path} 
                      fill={prize.color} 
                      stroke="#0F0F1A" 
                      strokeWidth="3.5"
                    />
                    {/* Text and Icon grouped inside segment */}
                    <g transform={`translate(${tx}, ${ty}) rotate(${midAngle + 90})`}>
                      <text
                        textAnchor="middle"
                        fill={prize.textColor}
                        fontSize="11.5"
                        fontWeight="700"
                        fontFamily="Poppins, system-ui"
                        className="tracking-wide text-center"
                      >
                        {/* Cut label if too long for slice */}
                        {prize.name.length > 15 ? `${prize.name.substring(0, 13)}...` : prize.name}
                      </text>
                      {prize.icon && (
                        <text
                          y="18"
                          textAnchor="middle"
                          fontSize="13"
                        >
                          {prize.icon}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}

              {/* Central Premium Hub Cover */}
              <circle cx="200" cy="200" r="32" fill="#0A0A10" stroke="#1F1F2F" strokeWidth="4" />
              <circle cx="200" cy="200" r="18" fill={activeBrand.primaryColor} />
              <circle cx="200" cy="200" r="6" fill="#FFFFFF" opacity="0.3" />
            </svg>
          </div>

          {/* FLOCK OF 12 CIRCULAR LED LIGHTS ON BEZEL */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 360) / 12 - 90;
            const rad = angle * (Math.PI / 180);
            const radius = 143; // Placed on rim bezel
            const lx = 145 + radius * Math.cos(rad);
            const ly = 145 + radius * Math.sin(rad);
            const isLit = ledFlash ? (i % 2 === 0) : (i % 2 !== 0);

            return (
              <div 
                key={i}
                className="absolute w-2 h-2 rounded-full border border-black/10 transition-colors duration-200"
                style={{
                  left: `${lx + 6}px`,
                  top: `${ly + 6}px`,
                  backgroundColor: isLit ? activeBrand.secondaryColor : '#1F1F2F',
                  boxShadow: isLit ? `0 0 8px ${activeBrand.secondaryColor}` : 'none'
                }}
              />
            );
          })}
        </div>

        {/* Physical Top Pointer / Needle Indicator (Pointer) */}
        <div id="wheel-pointer" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[158px] z-30">
          <svg width="28" height="38" viewBox="0 0 28 38" fill="none" className="filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
            {/* The pointer pin and body */}
            <path d="M14 38L0 12C0 12 4.5 0 14 0C23.5 0 28 12 28 12L14 38Z" fill="#FBBF24" />
            <path d="M14 26L5 10C5 10 7.5 3 14 3C20.5 3 23 10 23 10L14 26Z" fill="#F59E0B" />
            <circle cx="14" cy="10" r="4" fill="#0A0A10" />
          </svg>
        </div>
      </div>

      {/* Interactive Controls & CTA */}
      <div id="game-controls" className="flex flex-col gap-4">
        {/* Instructional tip */}
        <div id="tap-to-spin-instruction" className="text-center">
          <p className="text-[11px] text-slate-500 font-mono flex items-center justify-center gap-1.5 uppercase tracking-wide">
            <Volume2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Turn on sound for the full ticker effect</span>
          </p>
        </div>

        {/* Big Action CTA Trigger */}
        <motion.button
          whileHover={!isSpinning ? { scale: 1.02 } : {}}
          whileTap={!isSpinning ? { scale: 0.98 } : {}}
          id="spin-trigger-btn"
          disabled={isSpinning}
          onClick={handleSpinClick}
          className={`w-full min-h-[52px] py-3.5 rounded-2xl text-sm font-extrabold tracking-wider flex items-center justify-center gap-2 text-white shadow-lg cursor-pointer transition-all duration-300 ${
            isSpinning 
              ? 'bg-[#1F1F2E] border border-[#2D2D3F] cursor-not-allowed opacity-75' 
              : ''
          }`}
          style={!isSpinning ? { 
            background: `linear-gradient(135deg, ${activeBrand.gradientFrom}, ${activeBrand.gradientTo})`,
            boxShadow: `0 10px 25px ${activeBrand.primaryColor}30`
          } : {}}
        >
          {isSpinning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>SPINNING CHANCE / جاري السحب...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>SPIN THE WHEEL / أدر العجلة 🚀</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};
