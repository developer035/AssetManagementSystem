import React from 'react';
import { Download, FileJson, FileSpreadsheet, Archive } from 'lucide-react';
import { downloadExport } from '../services/api';
import { useDetectionStore } from '../store/detectionStore';

const EXPORT_FORMATS = [
  { key: 'geojson', label: 'GeoJSON', icon: FileJson, desc: 'Geographic features for GIS stacks and web maps.' },
  { key: 'csv', label: 'CSV', icon: FileSpreadsheet, desc: 'Tabular delivery for sheets, QA logs, or bulk review.' },
  { key: 'shapefile', label: 'Shapefile', icon: Archive, desc: 'Zipped ESRI-compatible layers for established GIS workflows.' },
];

export default function ExportPanel() {
  const { jobId } = useDetectionStore();

  if (!jobId) return null;

  const handleExport = async (format) => {
    try {
      await downloadExport(jobId, format);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="glass-card p-5 animate-slide-in-right" id="export-panel" style={{ animationDelay: '0.1s' }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand-500/12 p-2.5 text-brand-200">
            <Download size={18} />
          </div>
          <div>
            <p className="panel-kicker mb-1">Output Delivery</p>
            <h2 className="text-sm font-semibold text-white">Export without reformatting</h2>
          </div>
        </div>
        <div className="subtle-badge">GIS ready</div>
      </div>

      <div className="space-y-2">
        {EXPORT_FORMATS.map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            onClick={() => handleExport(key)}
            id={`export-btn-${key}`}
            className="group w-full rounded-[22px] border border-surface-700/20 bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-brand-500/26 hover:bg-brand-500/8"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-surface-700/20 bg-surface-900/72 p-2 text-brand-200 transition-colors group-hover:border-brand-500/20 group-hover:bg-brand-500/12">
                <Icon size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-[11px] leading-5 text-surface-300/64">{desc}</p>
              </div>
              <Download size={14} className="mt-1 text-surface-300/46 transition-colors group-hover:text-brand-100" />
            </div>
          </button>
        ))}
      </div>

      <div className="section-divider mt-4 pt-3">
        <p className="text-[10px] text-surface-300/42 font-mono truncate">
          Job reference: {jobId}
        </p>
      </div>
    </div>
  );
}
