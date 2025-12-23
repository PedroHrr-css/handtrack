import React from 'react';

interface ShapeVisualizerProps {
  scale: number;
  rotation: number;
  isActive: boolean;
}

export const ShapeVisualizer: React.FC<ShapeVisualizerProps> = ({ scale, rotation, isActive }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-neutral-900/50 relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10" 
           style={{ 
             backgroundImage: 'linear-gradient(#4b5563 1px, transparent 1px), linear-gradient(90deg, #4b5563 1px, transparent 1px)',
             backgroundSize: '20px 20px' 
           }} 
      />

      {/* The Controlled Shape */}
      <div 
        className="transition-transform duration-75 ease-out will-change-transform"
        style={{
          transform: `scale(${Math.max(0.2, scale)}) rotate(${rotation}deg)`
        }}
      >
        <svg width="200" height="200" viewBox="0 0 100 100" className="overflow-visible">
          <path
            d="M 50 15 L 85 85 L 15 85 Z" // Triangle Path
            fill="transparent"
            stroke={isActive ? "#34d399" : "#525252"} // Emerald or Gray
            strokeWidth="3"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]"
          />
          {/* Inner Dot */}
          <circle cx="50" cy="55" r="2" fill={isActive ? "#34d399" : "#525252"} />
        </svg>
      </div>

      {/* HUD Info */}
      <div className="absolute bottom-2 left-3 text-[10px] font-mono text-neutral-500 flex gap-4">
        <span>SCL: {scale.toFixed(2)}</span>
        <span>ROT: {Math.round(rotation)}°</span>
      </div>
    </div>
  );
};