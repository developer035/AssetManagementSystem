import React from 'react';
import { BarChart3, Layers } from 'lucide-react';
import { useDetectionStore } from '../store/detectionStore';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../utils/colorMap';

export default function AssetSummary() {
  const { detectionResult, confidenceThreshold } = useDetectionStore();

  if (!detectionResult?.summary) return null;

  const { summary, total_detections } = detectionResult;
  const categories = Object.entries(summary).sort((a, b) => b[1].count - a[1].count);
  const dominantCategory = categories[0];
  const maxCount = Math.max(...categories.map(([, stats]) => stats.count), 1);
  const visibleShare = Math.round((categories.length / 8) * 100);

  return (
    <div className="glass-card p-5 animate-slide-in-right" id="asset-summary-panel">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="panel-kicker mb-2">Detection Summary</p>
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-brand-500/12 p-2.5 text-brand-200">
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Scene composition at a glance</h2>
              <p className="text-xs text-surface-300/68">
                {total_detections} total detections at {Math.round(confidenceThreshold * 100)}% threshold
              </p>
            </div>
          </div>
        </div>
        <div className="stat-badge">
          <Layers size={12} />
          {categories.length} categories
        </div>
      </div>

      {dominantCategory && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="metric-card sm:col-span-2">
            <p className="panel-kicker mb-2">Dominant class</p>
            <p className="text-lg font-semibold text-white">
              {CATEGORY_LABELS[dominantCategory[0]] || dominantCategory[0]}
            </p>
            <p className="mt-2 text-xs leading-6 text-surface-200/68">
              Accounts for {dominantCategory[1].count} detections with an average confidence of{' '}
              {Math.round(dominantCategory[1].avg_confidence * 100)}%.
            </p>
          </div>
          <div className="metric-card">
            <p className="panel-kicker mb-2">Coverage spread</p>
            <p className="text-lg font-semibold text-white">{visibleShare}%</p>
            <p className="mt-2 text-xs leading-6 text-surface-200/68">
              Distinct asset groups represented in the current scan.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {categories.map(([category, stats]) => {
          const color = CATEGORY_COLORS[category] || '#888';
          const label = CATEGORY_LABELS[category] || category;
          const barWidth = (stats.count / maxCount) * 100;

          return (
            <div key={category} className="rounded-[22px] border border-surface-700/20 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="category-dot" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-surface-100">{label}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="font-mono font-semibold text-white">{stats.count}</span>
                  {stats.total_area_sqm > 0 && (
                    <span className="font-mono text-surface-300/70">
                      {stats.total_area_sqm.toLocaleString()} m²
                    </span>
                  )}
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-surface-800/80">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${color}bb, ${color})`,
                    boxShadow: `0 0 16px ${color}38`,
                  }}
                />
              </div>

              {stats.avg_confidence > 0 && (
                <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-surface-300/48">
                  Average confidence {Math.round(stats.avg_confidence * 100)}%
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
