import { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface GestureData {
  scale?: number;
  rotation?: number;
}

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isActive: boolean,
  onGestureUpdate: (data: GestureData) => void
) {
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    const initLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });
    };

    initLandmarker();

    return () => {
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // Drawing & Analysis Loop
  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) {
      cancelAnimationFrame(requestRef.current);
      // Clear canvas if stopping
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const draw = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (video && canvas && ctx && landmarkerRef.current) {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          // Sync canvas size to video size
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Detect
          const startTimeMs = performance.now();
          const results = landmarkerRef.current.detectForVideo(video, startTimeMs);

          // Clear
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          let newScale = undefined;
          let newRotation = undefined;

          // Process Results
          if (results.landmarks && results.handedness) {
            for (let i = 0; i < results.landmarks.length; i++) {
              const landmarks = results.landmarks[i];
              const handType = results.handedness[i][0].categoryName; // "Left" or "Right"
              
              drawHand(ctx, landmarks);

              // ---------------------------------------------------------
              // GESTURE LOGIC
              // ---------------------------------------------------------
              
              // RIGHT HAND -> Control SIZE (Pinch Thumb & Index)
              if (handType === "Right") {
                const thumbTip = landmarks[4];
                const indexTip = landmarks[8];
                
                // Euclidean Distance
                const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
                
                // Map distance (approx 0.02 to 0.2) to Scale (0.5 to 3.0)
                // Multiplier 15 makes it responsive
                newScale = Math.min(Math.max(distance * 15, 0.2), 4.0);
              }

              // LEFT HAND -> Control ROTATION (Wrist angle)
              if (handType === "Left") {
                const wrist = landmarks[0];
                const middleFingerMCP = landmarks[9];

                // Calculate angle in radians
                // Note: Y increases downwards in canvas
                const dx = middleFingerMCP.x - wrist.x;
                const dy = middleFingerMCP.y - wrist.y;
                
                // Calculate angle relative to "up" (-PI/2)
                const angleRad = Math.atan2(dy, dx);
                
                // Convert to degrees and adjust so hand straight up is roughly 0 rotation
                newRotation = (angleRad * 180 / Math.PI) + 90; 
              }
            }
          }
          
          // Send data back to App
          if (newScale !== undefined || newRotation !== undefined) {
             onGestureUpdate({ scale: newScale, rotation: newRotation });
          }
        }
      }
      requestRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, videoRef, canvasRef, onGestureUpdate]);
}

// Simple drawing helper
function drawHand(ctx: CanvasRenderingContext2D, landmarks: any[]) {
  // Style for dots
  ctx.fillStyle = "#34d399"; // Emerald 400
  ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
  ctx.lineWidth = 2;

  // Draw connections
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [5, 9], [9, 10], [10, 11], [11, 12], // Middle
    [9, 13], [13, 14], [14, 15], [15, 16], // Ring
    [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Pinky & Base
  ];

  for (const [start, end] of connections) {
    const p1 = landmarks[start];
    const p2 = landmarks[end];
    ctx.beginPath();
    ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
    ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
    ctx.stroke();
  }

  // Draw dots
  for (const point of landmarks) {
    const x = point.x * ctx.canvas.width;
    const y = point.y * ctx.canvas.height;
    
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
}