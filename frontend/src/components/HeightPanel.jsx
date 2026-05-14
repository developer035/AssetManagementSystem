import React from 'react';
import { Building2, Ruler, Sun } from 'lucide-react';
import { estimateHeights } from '../services/api';
import { useDetectionStore } from '../store/detectionStore';

export default function HeightPanel() {
  const { uploadedImage, heightResult, heightLoading, setHeightLoading, setHeightResult } = useDetectionStore();

  const handleEstimate = async () => {
    if (!uploadedImage) return;
    setHeightLoading(true);
    try {
      const result = await estimateHeights(uploadedImage);
      setHeightResult(result);
    } catch (err) {
      console.error('Height estimation failed:', err);
      setHeightLoading(false);
    }
  };

  return (
    <div className="glass-card p-5 animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/12 p-2.5 text-emerald-300">
            <Ruler size={18} />
          </div>
          <div>
            <p className="panel-kicker mb-1">Vertical Insight</p>
            <h2 className="text-sm font-semibold text-white">3D height estimation</h2>
          </div>
        </div>
        <div className="subtle-badge">Shadow analysis</div>
      </div>

      {uploadedImage && !heightResult && (
        <button
          onClick={handleEstimate}
          disabled={heightLoading}
          className="w-full rounded-[22px] border border-emerald-400/20 bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-500 px-4 py-3 text-xs font-semibold text-surface-950 shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-0.5"
        >
          {heightLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-surface-950/20 border-t-surface-950 animate-spin" />
              Analyzing shadows...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Sun size={14} />
              Estimate building heights
            </span>
          )}
        </button>
      )}

      {heightResult && (
        <div className="space-y-3">
          <div className="metric-card">
            <p className="panel-kicker mb-2">Buildings analyzed</p>
            <p className="text-2xl font-semibold tracking-[-0.04em] text-white">
              {heightResult.total_buildings}
            </p>
            <p className="mt-2 text-xs leading-6 text-surface-200/66">
              Estimates blend detected building footprints with shadow-derived heuristics.
            </p>
          </div>

          {heightResult.height_estimates?.length > 0 ? (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {heightResult.height_estimates.map((estimate, index) => (
                <div key={index} className="rounded-[22px] border border-surface-700/20 bg-white/[0.02] p-3.5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
                        <Building2 size={12} />
                      </div>
                      <span className="text-xs font-semibold text-white">Building #{index + 1}</span>
                    </div>
                    <span className="text-xs font-mono text-surface-300/58">
                      {Math.round(estimate.confidence * 100)}% conf
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-surface-700/18 bg-surface-900/60 p-2 text-center">
                      <p className="text-sm font-semibold text-white">{estimate.estimated_height_m}m</p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-surface-300/42">Height</p>
                    </div>
                    <div className="rounded-2xl border border-surface-700/18 bg-surface-900/60 p-2 text-center">
                      <p className="text-sm font-semibold text-brand-200">{estimate.floors_estimate}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-surface-300/42">Floors</p>
                    </div>
                    <div className="rounded-2xl border border-surface-700/18 bg-surface-900/60 p-2 text-center">
                      <p className="text-[10px] font-semibold capitalize text-surface-100">
                        {estimate.estimation_method.replace('_', ' ')}
                      </p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-surface-300/42">Method</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-[20px] border border-surface-700/18 bg-white/[0.02] py-4 text-center text-xs text-surface-300/56">
              No buildings were detected strongly enough for height estimation in this scan.
            </p>
          )}
        </div>
      )}

      {!uploadedImage && (
        <p className="rounded-[20px] border border-surface-700/18 bg-white/[0.02] py-4 text-center text-xs text-surface-300/48">
          Upload imagery first to unlock height estimation.
        </p>
      )}
    </div>
  );
}
