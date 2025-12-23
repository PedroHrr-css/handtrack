import React from 'react';

interface VideoFeedProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    processingCanvasRef: React.RefObject<HTMLCanvasElement>; // Renamed for clarity
    overlayCanvasRef: React.RefObject<HTMLCanvasElement>;    // New overlay canvas
    isActive: boolean;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({ videoRef, processingCanvasRef, overlayCanvasRef, isActive }) => {
    return (
        <div className="relative w-full h-full bg-neutral-950 flex items-center justify-center">
            {/* Main Video */}
            <video 
                ref={videoRef}
                className={`w-full h-full object-cover transform scale-x-[-1] ${isActive ? 'opacity-100' : 'opacity-20'}`}
                autoPlay
                playsInline
                muted 
            />
            
            {/* Visual Tracking Overlay (Visible) - Mirrored to match video */}
            <canvas 
                ref={overlayCanvasRef} 
                className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]"
            />

            {/* Hidden Processing Canvas (for Gemini) */}
            <canvas ref={processingCanvasRef} className="hidden" />
            
            {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <button className="w-16 h-16 rounded-full border-2 border-neutral-700 flex items-center justify-center text-neutral-700">
                       <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-neutral-700 border-b-[10px] border-b-transparent ml-1" />
                    </button>
                </div>
            )}
        </div>
    );
};