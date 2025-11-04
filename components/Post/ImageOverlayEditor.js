import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, X, ZoomIn, ZoomOut, Move, Sun, Loader2 } from "lucide-react";

export default function ImageOverlayEditor({ baseImage, scorecardImage, onSave, onCancel }) {
  const [overlayImage, setOverlayImage] = useState(scorecardImage || null);
  const [overlayPosition, setOverlayPosition] = useState({ x: 50, y: 50 });
  const [overlaySize, setOverlaySize] = useState({ width: 400, height: 175 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [baseImageDimensions, setBaseImageDimensions] = useState({ width: 0, height: 0 });

  // Load base image dimensions
  useEffect(() => {
    if (baseImage) {
      const img = new Image();
      img.src = baseImage;
      img.onload = () => {
        setBaseImageDimensions({ width: img.width, height: img.height });
        const initialWidth = Math.min(600, img.width * 0.8);
        const initialHeight = initialWidth * (350 / 800);
        setOverlaySize({ width: initialWidth, height: initialHeight });
      };
    }
  }, [baseImage]);

  useEffect(() => {
    if (scorecardImage) {
      setOverlayImage(scorecardImage);
    }
  }, [scorecardImage]);

  const handleOverlayUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOverlayImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStart = (clientX, clientY) => {
    if (!overlayImage || !containerRef.current) return false;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (
      x >= overlayPosition.x &&
      x <= overlayPosition.x + overlaySize.width &&
      y >= overlayPosition.y &&
      y <= overlayPosition.y + overlaySize.height
    ) {
      setIsDragging(true);
      setDragStart({ x: x - overlayPosition.x, y: y - overlayPosition.y });
      return true;
    }
    return false;
  };

  const handleMove = (clientX, clientY) => {
    if (!isDragging || !overlayImage || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left - dragStart.x;
    const y = clientY - rect.top - dragStart.y;
    
    setOverlayPosition({ x: Math.max(0, x), y: Math.max(0, y) });
  };

  const handleMouseDown = (e) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (handleStart(touch.clientX, touch.clientY)) {
        e.preventDefault();
      }
    }
  };

  const handleMouseMove = (e) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
      e.preventDefault();
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMouseMoveGlobal = (e) => handleMouseMove(e);
      const handleMouseUpGlobal = () => handleEnd();
      const handleTouchMoveGlobal = (e) => handleTouchMove(e);
      const handleTouchEndGlobal = () => handleEnd();

      window.addEventListener("mousemove", handleMouseMoveGlobal);
      window.addEventListener("mouseup", handleMouseUpGlobal);
      window.addEventListener("touchmove", handleTouchMoveGlobal, { passive: false });
      window.addEventListener("touchend", handleTouchEndGlobal);
      
      return () => {
        window.removeEventListener("mousemove", handleMouseMoveGlobal);
        window.removeEventListener("mouseup", handleMouseUpGlobal);
        window.removeEventListener("touchmove", handleTouchMoveGlobal);
        window.removeEventListener("touchend", handleTouchEndGlobal);
      };
    }
  }, [isDragging, dragStart, overlayPosition]);

  const handleSizeChange = (delta) => {
    setOverlaySize({
      width: Math.max(100, overlaySize.width + delta),
      height: Math.max(44, overlaySize.height + (delta * 350/800))
    });
  };

  // Apply brightness to image data directly
  const applyBrightnessToCanvas = (ctx, canvas) => {
    if (brightness === 100) return; // No adjustment needed
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const factor = brightness / 100;
    
    // Apply brightness adjustment to each pixel
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * factor);     // Red
      data[i + 1] = Math.min(255, data[i + 1] * factor); // Green
      data[i + 2] = Math.min(255, data[i + 2] * factor); // Blue
      // data[i + 3] is alpha, leave unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const handleSaveComposite = async () => {
    setIsSaving(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      
      // Load base image
      const baseImg = new Image();
      baseImg.crossOrigin = "anonymous";
      baseImg.src = baseImage;
      
      await new Promise((resolve, reject) => {
        baseImg.onload = resolve;
        baseImg.onerror = reject;
      });

      // Set canvas size to match image
      canvas.width = baseImg.naturalWidth;
      canvas.height = baseImg.naturalHeight;
      
      // Draw base image
      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
      
      // Apply brightness adjustment by manipulating pixel data
      applyBrightnessToCanvas(ctx, canvas);

      // Draw overlay if present
      if (overlayImage) {
        const overlayImg = new Image();
        overlayImg.src = overlayImage;
        
        await new Promise((resolve, reject) => {
          overlayImg.onload = resolve;
          overlayImg.onerror = reject;
        });

        const containerWidth = containerRef.current ? containerRef.current.offsetWidth : baseImageDimensions.width;
        const containerHeight = containerRef.current ? containerRef.current.offsetHeight : baseImageDimensions.height;
        
        const previewScaleFactorX = canvas.width / containerWidth;
        const previewScaleFactorY = canvas.height / containerHeight;

        ctx.drawImage(
          overlayImg,
          overlayPosition.x * previewScaleFactorX,
          overlayPosition.y * previewScaleFactorY,
          overlaySize.width * previewScaleFactorX,
          overlaySize.height * previewScaleFactorY
        );
      }

      // Convert to blob and create file
      canvas.toBlob((blob) => {
        const file = new File([blob], "composite-image.png", { type: "image/png" });
        setIsSaving(false);
        onSave(file);
      }, "image/png", 1.0);
    } catch (error) {
      console.error("Error saving composite:", error);
      alert("Failed to save image. Please try again.");
      setIsSaving(false);
    }
  };

  const handleSkipOrContinue = () => {
    if (brightness === 100 && !overlayImage) {
      onSave(null); 
    } else {
      handleSaveComposite();
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Adjust Your Image</h3>
          <Button variant="ghost" size="icon" onClick={onCancel} disabled={isSaving}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {overlayImage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              Drag the scorecard to position it. Adjust brightness below. Changes will be saved to your image.
            </p>
          </div>
        )}

        {!overlayImage && !scorecardImage && (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-green-300 rounded-lg cursor-pointer bg-green-50 hover:bg-green-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-sm text-green-700 font-medium">
                Upload Transparent Scorecard PNG
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/png"
              onChange={handleOverlayUpload}
            />
          </label>
        )}

        {/* Brightness Control */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Sun className="w-4 h-4 text-gray-600" />
            Image Brightness
          </Label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
              disabled={isSaving}
            />
            <span className="text-sm font-medium text-gray-700 w-12">{brightness}%</span>
          </div>
        </div>

        {/* Preview Area */}
        <div
          ref={containerRef}
          className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden touch-none select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{ touchAction: 'none' }}
        >
          <img
            src={baseImage}
            alt="Base"
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
            style={{ filter: `brightness(${brightness}%)` }}
          />
          
          {overlayImage && (
            <div
              className="absolute border-2 border-green-500"
              style={{
                left: `${overlayPosition.x}px`,
                top: `${overlayPosition.y}px`,
                width: `${overlaySize.width}px`,
                height: `${overlaySize.height}px`,
                touchAction: 'none'
              }}
            >
              <img
                src={overlayImage}
                alt="Overlay"
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500" />
            </div>
          )}
          
          {overlayImage && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/90 rounded-lg p-2 pointer-events-none">
              <Move className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-700">Drag to position</span>
            </div>
          )}
        </div>

        {/* Controls */}
        {overlayImage && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSizeChange(-30)}
                disabled={isSaving}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSizeChange(30)}
                disabled={isSaving}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverlayImage(null)}
                disabled={isSaving}
              >
                Remove Overlay
              </Button>
            </div>
            <Button
              onClick={handleSaveComposite}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Apply Changes'
              )}
            </Button>
          </div>
        )}

        {!overlayImage && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSkipOrContinue}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : brightness === 100 ? (
                'Continue'
              ) : (
                'Apply Brightness & Continue'
              )}
            </Button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
}
