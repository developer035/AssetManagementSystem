import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Line, Text, Group } from 'react-konva';
import { useDetectionStore } from '../store/detectionStore';

export default function DetectionOverlay() {
  const { imageUrl, detectionResult, selectedCategories, confidenceThreshold } =
    useDetectionStore();

  const containerRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(700);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // Responsive container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Load image
  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      setScale(containerWidth / img.naturalWidth);
    };
  }, [imageUrl, containerWidth]);

  if (!image || !detectionResult) return null;

  const stageWidth = containerWidth;
  const stageHeight = image.naturalHeight * scale;

  let activeDetections = detectionResult.detections.filter((det) => {
    if (det.confidence < confidenceThreshold) return false;
    if (selectedCategories && !selectedCategories.includes(det.category)) return false;
    return true;
  });

  // Sort by confidence descending
  activeDetections.sort((a, b) => b.confidence - a.confidence);

  const totalActive = activeDetections.length;
  // Increased from 100 to 500 so dense assets (like trees) aren't cut off
  const MAX_RENDER = 500;
  const renderedDetections = activeDetections.slice(0, MAX_RENDER);

  return (
    <div ref={containerRef} className="detection-canvas-container relative w-full animate-fade-in">
      <Stage width={stageWidth} height={stageHeight}>
        <Layer>
          {/* Base image */}
          <KonvaImage image={image} width={stageWidth} height={stageHeight} />

          {/* Detection overlays */}
          {renderedDetections.map((det, i) => {
            const [x1, y1, x2, y2] = det.bbox_pixels;
            const w = (x2 - x1) * scale;
            const h = (y2 - y1) * scale;
            
            const isHovered = hoveredIdx === i;
            const strokeWidth = 2; // Fixed stroke width
            const fillOpacity = isHovered ? '66' : '26'; // 40% (66 hex) vs 15% (26 hex)

            // Only show labels for boxes large enough
            const showLabel = w > 60 && h > 20;
            const labelText = w < 80 ? det.category : `${det.category} ${Math.round(det.confidence * 100)}%`;

            return (
              <Group
                key={i}
                onMouseMove={(e) => {
                  const stage = e.target.getStage();
                  const pos = stage.getPointerPosition();
                  setHoveredIdx(i);
                  setTooltip({ x: pos.x, y: pos.y, det });
                }}
                onMouseLeave={() => {
                  setHoveredIdx(null);
                  setTooltip(null);
                }}
              >
                {/* Mask polygon if available */}
                {det.mask_polygon && det.mask_polygon.length > 2 ? (
                  <Line
                    points={det.mask_polygon.flat().map((v) => v * scale)}
                    fill={det.color + fillOpacity}
                    stroke={det.color}
                    strokeWidth={strokeWidth}
                    closed
                    perfectDrawEnabled={false}
                    listening={false}
                  />
                ) : (
                  <Rect
                    x={x1 * scale}
                    y={y1 * scale}
                    width={w}
                    height={h}
                    stroke={det.color}
                    strokeWidth={strokeWidth}
                    fill={det.color + fillOpacity}
                    cornerRadius={2}
                    perfectDrawEnabled={false}
                    listening={false}
                  />
                )}

                {/* Text Label Inside Box */}
                {showLabel && (
                  <Text
                    x={x1 * scale + 4}
                    y={y1 * scale + 4}
                    text={labelText}
                    fontSize={11}
                    fill="#FFFFFF"
                    fontFamily="Avenir Next, Avenir, Segoe UI, sans-serif"
                    fontStyle="600"
                    shadowColor="black"
                    shadowBlur={3}
                    shadowOffsetX={1}
                    shadowOffsetY={1}
                    shadowOpacity={0.9}
                    perfectDrawEnabled={false}
                    listening={false}
                  />
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* HTML Tooltip Overlay on Hover */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-surface-950/95 border border-surface-700/50 rounded-xl p-3 shadow-2xl backdrop-blur-sm"
          style={{
            left: Math.min(tooltip.x + 15, stageWidth - 150),
            top: Math.min(tooltip.y + 15, stageHeight - 100),
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tooltip.det.color }} />
            <span className="text-xs font-bold text-white">{tooltip.det.category}</span>
          </div>
          <div className="space-y-0.5 mt-2">
            <p className="text-[10px] text-surface-300">
              Confidence: <span className="font-mono text-brand-400 font-semibold">{Math.round(tooltip.det.confidence * 100)}%</span>
            </p>
            {tooltip.det.area_sqm && (
              <p className="text-[10px] text-surface-300">
                Area: <span className="font-mono text-emerald-400 font-semibold">{tooltip.det.area_sqm.toFixed(1)} m²</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Detection count badges and Warnings */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 items-end pointer-events-none">
        <div className="stat-badge bg-surface-900/80 backdrop-blur-sm shadow-lg border border-surface-700/50">
          {totalActive} detections
        </div>
        
        {totalActive > MAX_RENDER && (
          <div className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg backdrop-blur-md shadow-lg animate-fade-in">
            Showing top {MAX_RENDER} of {totalActive} detections
          </div>
        )}
      </div>
    </div>
  );
}
