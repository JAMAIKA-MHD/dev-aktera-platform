import React from "react";
import { PlayerScreenConfig } from "../../types";

interface PlayerEditorCanvasProps {
  deviceType: "desktop" | "tablet" | "mobile";
  config: PlayerScreenConfig;
}

export function PlayerEditorCanvas({ deviceType, config }: PlayerEditorCanvasProps) {
  // Map device type to canvas container width
  const deviceWidths = {
    desktop: "max-w-4xl",
    tablet: "max-w-xl",
    mobile: "max-w-[375px]",
  };

  const widthClass = deviceWidths[deviceType];
  const { theme } = config;

  // Render a static mockup that reacts to brand colors
  // Ensure we use the brand colors, not editor colors here.
  const appStyle: React.CSSProperties = {
    fontFamily: theme.fontFamily || "inherit",
    borderRadius: theme.borderRadius === "pill" ? "24px" : theme.borderRadius === "sharp" ? "0px" : "12px",
  };

  const bgVal = theme.background?.value || "";
  const bgStyle: React.CSSProperties = {
    background: theme.background?.type === 'solid' 
      ? (bgVal || theme.primaryColor)
      : theme.background?.type === 'gradient'
        ? `linear-gradient(135deg, ${bgVal.split(',')[0] || theme.primaryColor}, ${bgVal.split(',')[1] || theme.secondaryColor})`
        : `url(${bgVal}) center/cover`,
  };

  return (
    <div className="flex-1 bg-[#0B0F1E] flex flex-col items-center overflow-y-auto p-4 sm:p-8">
      {/* Canvas Wrapper */}
      <div 
        className={`w-full ${widthClass} min-h-[600px] flex flex-col transition-all duration-300 relative shadow-2xl overflow-hidden`}
        style={{ ...bgStyle, ...appStyle }}
      >
        {/* Mockup Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          {theme.logoUrl && (
            <img src={theme.logoUrl} alt="Brand Logo" className="w-24 h-24 object-contain mb-8" />
          )}
          
          <h1 className="text-3xl font-bold mb-4" style={{ color: theme.mode === 'light' ? '#1f2937' : '#ffffff' }}>
            Win A Prize!
          </h1>
          
          <p className="mb-8 max-w-sm" style={{ color: theme.mode === 'light' ? '#4b5563' : '#d1d5db' }}>
            This is a static preview representing the player screen. As you adjust colors and logo, this mockup reflects those changes instantly.
          </p>

          <button 
            className="px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105"
            style={{ 
              backgroundColor: theme.primaryColor, 
              color: '#ffffff',
              borderRadius: theme.borderRadius === "pill" ? "9999px" : theme.borderRadius === "sharp" ? "0px" : "8px" 
            }}
          >
            Play Now
          </button>
        </div>

        {/* Brand Watermark mock */}
        {theme.showBrandWatermark && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
            <span className="text-[10px] uppercase font-bold opacity-50" style={{ color: theme.mode === 'light' ? '#000' : '#fff' }}>
              Powered by Aktera
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
