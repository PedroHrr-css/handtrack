import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionStatus } from '../types';
import { blobToBase64 } from '../services/audioUtils';

// Constants
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const FRAME_RATE = 2; // Low frame rate is sufficient for simple gesture naming
const JPEG_QUALITY = 0.5;

export function useGeminiLive() {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [currentGesture, setCurrentGesture] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Session & Interval Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const connect = useCallback(async () => {
    try {
      setStatus(ConnectionStatus.CONNECTING);
      setCurrentGesture('');

      // Access Camera Only
      const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: false, 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: "user"
          } 
      });
      streamRef.current = stream;

      // Setup Video Element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const config = {
        model: MODEL_NAME,
        config: {
          // Gemini Live requires AUDIO modality, but we will ignore the audio output 
          // and use the transcription text instead.
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {}, // Enable transcription to get text back
          systemInstruction: "You are a hand gesture tracker. Continually watch the video. When you see a hand gesture, output ONLY its name in UPPERCASE (e.g. 'THUMBS UP', 'PEACE SIGN', 'WAVING', 'FIST', 'OPEN HAND', 'HEART SHAPE'). If no clear gesture, output 'NO GESTURE'. Do not speak full sentences. Be extremely concise.",
        },
      };

      // Connect Session
      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Session Opened");
            setStatus(ConnectionStatus.CONNECTED);
            startVideoStream();
          },
          onmessage: async (message: LiveServerMessage) => {
            // We focus purely on the transcription text
            if (message.serverContent?.outputTranscription?.text) {
              const text = message.serverContent.outputTranscription.text.trim();
              if (text) {
                // Update the gesture display
                setCurrentGesture(prev => {
                    // Accumulate or replace based on flow? 
                    // Since the model instructs to output single phrases, replacement is usually better 
                    // for a "state" display, but transcription comes in chunks.
                    // We'll just set it to the latest chunk if it looks like a complete phrase, 
                    // or append if needed. For this specific prompt, simpler is better:
                    return text; 
                });
              }
            }
          },
          onclose: () => {
            console.log("Gemini Live Session Closed");
            setStatus(ConnectionStatus.DISCONNECTED);
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            setStatus(ConnectionStatus.ERROR);
          },
        },
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed:", error);
      setStatus(ConnectionStatus.ERROR);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
          if(session.close) session.close();
      }).catch(() => {});
      sessionPromiseRef.current = null;
    }

    // Stop Media Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop Intervals
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    setStatus(ConnectionStatus.DISCONNECTED);
    setCurrentGesture('');
  }, []);

  // --- Video Streaming Setup ---
  const startVideoStream = () => {
    frameIntervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && sessionPromiseRef.current) {
        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth * 0.5; // Downscale for bandwidth
          canvas.height = video.videoHeight * 0.5;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob(async (blob) => {
            if (blob) {
              const base64Data = await blobToBase64(blob);
              sessionPromiseRef.current?.then(session => {
                 session.sendRealtimeInput({
                   media: { 
                     data: base64Data, 
                     mimeType: 'image/jpeg' 
                   }
                 });
              });
            }
          }, 'image/jpeg', JPEG_QUALITY);
        }
      }
    }, 1000 / FRAME_RATE);
  };

  useEffect(() => {
    return () => {
      disconnect(); // Cleanup on unmount
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    status,
    currentGesture,
    videoRef,
    canvasRef
  };
}