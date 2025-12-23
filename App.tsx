import React, { useState, useRef, useCallback } from 'react';
import { VideoFeed } from './components/VideoFeed';
import { ShapeVisualizer } from './components/ShapeVisualizer';
import { useGeminiLive } from './hooks/useGeminiLive';
import { useHandTracking } from './hooks/useHandTracking';
import { ConnectionStatus } from './types';

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [shapeState, setShapeState] = useState({ scale: 1, rotation: 0 });
  
  // Gemini Hook (Kept for potential text output, though visually replaced)
  const { connect, disconnect, status, videoRef, canvasRef: processingCanvasRef } = useGeminiLive();
  
  // Visual Tracking Hook Overlay Canvas
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Gesture Update Handler
  const handleGestureUpdate = useCallback((data: { scale?: number, rotation?: number }) => {
    setShapeState(prev => ({
      scale: data.scale !== undefined ? data.scale : prev.scale,
      rotation: data.rotation !== undefined ? data.rotation : prev.rotation
    }));
  }, []);

  // Activate visual tracking when active
  useHandTracking(videoRef, overlayCanvasRef, isActive, handleGestureUpdate);

  const handleToggle = () => {
    if (isActive) {
      disconnect();
      setIsActive(false);
    } else {
      connect();
      setIsActive(true);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-900 flex flex-col items-center justify-center gap-8 p-4 font-mono">
      
      {/* Box 1: Shape Controller Display */}
      <div className="w-full max-w-[640px] h-[300px] bg-neutral-800 border-2 border-neutral-700 rounded-xl flex flex-col items-center justify-center overflow-hidden shadow-lg relative">
         <span className="absolute top-2 left-3 text-[10px] text-neutral-500 uppercase tracking-widest z-10">
            Gesture Control
         </span>
         
         {/* The Controlled Triangle */}
         <ShapeVisualizer 
            scale={shapeState.scale} 
            rotation={shapeState.rotation} 
            isActive={isActive} 
         />
      </div>

      {/* Box 2: Webcam Feed with Dots */}
      <div className="w-full max-w-[640px] aspect-video bg-black border-2 border-neutral-700 rounded-xl overflow-hidden shadow-2xl relative group">
          <VideoFeed 
              videoRef={videoRef} 
              processingCanvasRef={processingCanvasRef} 
              overlayCanvasRef={overlayCanvasRef}
              isActive={isActive}
          />
          
          {/* Minimal Controls Overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
             <button
               onClick={handleToggle}
               className={`px-6 py-2 rounded-full font-bold text-sm tracking-wide transition-colors pointer-events-auto ${
                 isActive 
                   ? 'bg-red-500 hover:bg-red-600 text-white' 
                   : 'bg-emerald-500 hover:bg-emerald-600 text-white'
               }`}
             >
               {isActive ? 'STOP TRACKING' : 'START CAMERA'}
             </button>
          </div>
          
          {/* Status Indicator */}
           <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
               <div className={`w-2 h-2 rounded-full ${
                   status === ConnectionStatus.CONNECTED ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
               }`} />
               <span className="text-[10px] text-white/80 uppercase">
                   {status}
               </span>
           </div>
      </div>

      {/* Helper Text */}
      <div className="text-neutral-500 text-xs mt-4 flex gap-8">
         <span className={isActive ? "text-emerald-400" : ""}>Left Hand: Rotate</span>
         <span className={isActive ? "text-emerald-400" : ""}>Right Hand: Pinch to Scale</span>
      </div>

    </div>
  );
}