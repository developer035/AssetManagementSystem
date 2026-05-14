import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useDetectionStore } from '../store/detectionStore';
import { CATEGORY_LABELS, CATEGORY_COLORS, getUniqueCategories } from '../utils/colorMap';

export default function ConfidenceFilter() {
  const {
    detectionResult,
    confidenceThreshold,
    setConfidenceThreshold,
    selectedCategories,
    toggleCategory,
    selectAllCategories,
  } = useDetectionStore();

  if (!detectionResult) return null;

  const allCategories = getUniqueCategories(detectionResult.detections || []);
  const activeCategories = selectedCategories || allCategories;
  const filteredCount = (detectionResult.detections || []).filter(
    (detection) => detection.confidence >= confidenceThreshold && activeCategories.includes(detection.category)
  ).length;

  return (
    <div className="glass-card p-5 animate-slide-in-right" id="confidence-filter" style={{ animationDelay: '0.2s' }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand-500/12 p-2.5 text-brand-200">
            <SlidersHorizontal size={18} />
          </div>
          <div>
            <p className="panel-kicker mb-1">Scene Controls</p>
            <h2 className="text-sm font-semibold text-white">Dial in what operators actually see</h2>
          </div>
        </div>
        <div className="stat-badge">{filteredCount} visible</div>
      </div>

      <div className="metric-card mb-5">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-xs font-medium text-surface-200/78">Confidence threshold</label>
          <span className="text-xs font-mono font-semibold text-brand-200">
            {Math.round(confidenceThreshold * 100)}%
          </span>
        </div>
        <input
          id="confidence-slider"
          type="range"
          min="0.2"
          max="1"
          step="0.05"
          value={confidenceThreshold}
          onChange={(event) => setConfidenceThreshold(parseFloat(event.target.value))}
          className="w-full"
        />
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-surface-300/42">
          <span>20%</span>
          <span>60%</span>
          <span>100%</span>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-xs font-medium text-surface-200/78">Category visibility</label>
          <button
            onClick={selectAllCategories}
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-200 transition-colors hover:text-brand-100"
          >
            Show all
          </button>
        </div>

        <div className="grid gap-2">
          {allCategories.map((category) => {
            const isActive = activeCategories.includes(category);
            const color = CATEGORY_COLORS[category] || '#888';
            const label = CATEGORY_LABELS[category] || category;
            const categoryCount = (detectionResult.detections || []).filter(
              (detection) => detection.category === category && detection.confidence >= confidenceThreshold
            ).length;

            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`
                  flex items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition-all duration-200
                  ${isActive
                    ? 'border-brand-500/22 bg-brand-500/10 text-surface-100'
                    : 'border-surface-700/20 bg-white/[0.02] text-surface-300/46'
                  }
                  hover:border-brand-500/30 hover:bg-white/[0.03]
                `}
              >
                <span className="category-dot" style={{ backgroundColor: color, opacity: isActive ? 1 : 0.35 }} />
                <span className="flex-1 text-xs font-semibold">{label}</span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-mono ${isActive ? 'bg-white/6 text-white' : 'bg-transparent text-surface-300/42'}`}>
                  {categoryCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
