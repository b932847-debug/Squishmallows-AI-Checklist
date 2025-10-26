
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { identifySquishmallow } from '../services/geminiService';
import { LoaderIcon } from './icons';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIdentified: (name: string) => void;
  allItems: string[];
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to convert blob to base64'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onIdentified, allItems }) => {
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      if (isOpen) {
        setResult(null);
        setError(null);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          setError("Could not access camera. Please check permissions.");
        }
      } else {
        stopCamera();
      }
    };
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  const handleCaptureAndIdentify = async () => {
    if (!videoRef.current) return;
    setIsIdentifying(true);
    setResult(null);
    setError(null);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        setError("Could not process image.");
        setIsIdentifying(false);
        return;
    }
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError("Failed to capture image.");
        setIsIdentifying(false);
        return;
      }
      try {
        const base64Image = await blobToBase64(blob);
        const identifiedName = await identifySquishmallow(base64Image, allItems);
        setResult(identifiedName);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setIsIdentifying(false);
      }
    }, 'image/jpeg', 0.9);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--muted-text)] hover:text-[var(--text)] transition">&times;</button>
        <h2 className="text-xl font-bold mb-4">Identify with Camera</h2>
        
        <div className="bg-slate-900 rounded-lg overflow-hidden aspect-video mb-4 border border-[var(--border-color)]">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
          {error && <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-red-400 p-4">{error}</div>}
        </div>

        {result ? (
          <div className="text-center">
            <p className="text-lg">Result: <span className="font-bold text-[var(--accent)]">{result}</span></p>
            {result !== "Unknown" && (
                <button 
                    onClick={() => onIdentified(result)} 
                    className="mt-4 bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition"
                >
                    Find in List & Mark as 'There'
                </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <button 
              onClick={handleCaptureAndIdentify} 
              disabled={isIdentifying || !!error}
              className="btn-accent px-6 py-3 rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full sm:w-auto mx-auto"
            >
              {isIdentifying ? (
                <>
                  <LoaderIcon className="w-6 h-6 mr-2 animate-spin" />
                  Identifying...
                </>
              ) : "Snap & Identify"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
