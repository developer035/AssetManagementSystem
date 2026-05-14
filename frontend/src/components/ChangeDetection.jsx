import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { GitCompare, Upload, AlertTriangle, Clock } from 'lucide-react';
import { compareImages } from '../services/api';
import { useDetectionStore } from '../store/detectionStore';

export default function ChangeDetection() {
  const { changeResult, changeLoading, changeError, setChangeLoading, setChangeError, setChangeResult } = useDetectionStore();
  const [fileBefore, setFileBefore] = useState(null);
  const [fileAfter, setFileAfter] = useState(null);
  const [previewBefore, setPreviewBefore] = useState(null);
  const [previewAfter, setPreviewAfter] = useState(null);
  const [sensitivity, setSensitivity] = useState(0.3);

  const onDropBefore = useCallback((files) => {
    if (files[0]) {
      setChangeError(null);
      setChangeResult(null);
      setFileBefore(files[0]);
      setPreviewBefore(URL.createObjectURL(files[0]));
    }
  }, [setChangeError, setChangeResult]);

  const onDropAfter = useCallback((files) => {
    if (files[0]) {
      setChangeError(null);
      setChangeResult(null);
      setFileAfter(files[0]);
      setPreviewAfter(URL.createObjectURL(files[0]));
    }
  }, [setChangeError, setChangeResult]);

  useEffect(() => () => {
    if (previewBefore) URL.revokeObjectURL(previewBefore);
  }, [previewBefore]);

  useEffect(() => () => {
    if (previewAfter) URL.revokeObjectURL(previewAfter);
  }, [previewAfter]);

  const dzBefore = useDropzone({ onDrop: onDropBefore, accept: { 'image/*': [] }, maxFiles: 1 });
  const dzAfter = useDropzone({ onDrop: onDropAfter, accept: { 'image/*': [] }, maxFiles: 1 });

  const handleCompare = async () => {
    if (!fileBefore || !fileAfter) return;
    setChangeLoading(true);
    try {
      const result = await compareImages(fileBefore, fileAfter, sensitivity);
      setChangeResult(result);
    } catch (err) {
      setChangeError(err.response?.data?.detail || 'Change detection failed');
    }
  };

  const severityColor = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#f59e0b',
    Low: '#22c55e',
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Upload Two Images */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Before Image */}
        <div>
          <p className="text-xs font-semibold text-surface-300 mb-2 flex items-center gap-1.5">
            <Clock size={12} /> Before (Earlier)
          </p>
          <div
            {...dzBefore.getRootProps()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-4 transition-all duration-300 min-h-[160px] flex items-center justify-center
              ${dzBefore.isDragActive ? 'border-brand-400 bg-brand-500/5' : 'border-surface-700/60 hover:border-brand-500/40'}`}
          >
            <input {...dzBefore.getInputProps()} />
            {previewBefore ? (
              <img src={previewBefore} alt="Before" className="max-h-[140px] rounded-lg object-contain" />
            ) : (
              <div className="text-center">
                <Upload className="mx-auto mb-2 text-surface-300/40" size={24} />
                <p className="text-xs text-surface-300/60">Drop earlier image</p>
              </div>
            )}
          </div>
        </div>

        {/* After Image */}
        <div>
          <p className="text-xs font-semibold text-surface-300 mb-2 flex items-center gap-1.5">
            <Clock size={12} /> After (Recent)
          </p>
          <div
            {...dzAfter.getRootProps()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-4 transition-all duration-300 min-h-[160px] flex items-center justify-center
              ${dzAfter.isDragActive ? 'border-brand-400 bg-brand-500/5' : 'border-surface-700/60 hover:border-brand-500/40'}`}
          >
            <input {...dzAfter.getInputProps()} />
            {previewAfter ? (
              <img src={previewAfter} alt="After" className="max-h-[140px] rounded-lg object-contain" />
            ) : (
              <div className="text-center">
                <Upload className="mx-auto mb-2 text-surface-300/40" size={24} />
                <p className="text-xs text-surface-300/60">Drop recent image</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sensitivity Slider */}
      <div className="glass-card p-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-medium text-surface-300">Detection Sensitivity</label>
          <span className="text-xs font-mono font-bold text-brand-400">{Math.round(sensitivity * 100)}%</span>
        </div>
        <input type="range" min="0.1" max="0.9" step="0.05" value={sensitivity}
          onChange={(e) => setSensitivity(parseFloat(e.target.value))} className="w-full" />
      </div>

      {/* Compare Button */}
      <button
        onClick={handleCompare}
        disabled={!fileBefore || !fileAfter || changeLoading}
        className={`w-full btn-primary flex items-center justify-center gap-2 ${(!fileBefore || !fileAfter) ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        {changeLoading ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing Changes...</>
        ) : (
          <><GitCompare size={16} /> Detect Changes</>
        )}
      </button>

      {/* Error */}
      {changeError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">{changeError}</div>
      )}

      {/* Results */}
      {changeResult && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-brand-400">{changeResult.change_percentage}%</p>
              <p className="text-[10px] text-surface-300 mt-1">Area Changed</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{(changeResult.ssim_score * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-surface-300 mt-1">Similarity (SSIM)</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{changeResult.total_change_regions}</p>
              <p className="text-[10px] text-surface-300 mt-1">Change Regions</p>
            </div>
          </div>

          {/* Summary Text */}
          <div className="glass-card p-4">
            <p className="text-xs text-surface-200 leading-relaxed">{changeResult.summary}</p>
          </div>

          {/* Heatmap */}
          {changeResult.heatmap_base64 && (
            <div className="glass-card overflow-hidden">
              <p className="text-xs font-semibold text-surface-300 p-3 pb-0">Change Heatmap</p>
              <img
                src={`data:image/png;base64,${changeResult.heatmap_base64}`}
                alt="Change heatmap"
                className="w-full rounded-b-2xl"
              />
            </div>
          )}

          {/* Change Regions List */}
          {changeResult.change_regions?.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-surface-200 mb-3">Detected Changes</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {changeResult.change_regions.map((region) => (
                  <div key={region.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800/40">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} style={{ color: severityColor[region.severity] }} />
                      <span className="text-xs text-surface-200">{region.change_type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-surface-300">{region.area_pct}%</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: severityColor[region.severity] + '20', color: severityColor[region.severity] }}>
                        {region.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
