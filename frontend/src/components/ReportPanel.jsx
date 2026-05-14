import React, { useEffect, useState } from 'react';
import { FileText, Download, Loader2, CheckCircle } from 'lucide-react';
import { downloadReport } from '../services/api';
import { useDetectionStore } from '../store/detectionStore';

export default function ReportPanel() {
  const { jobId } = useDetectionStore();
  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [cityName, setCityName] = useState('Bangalore');
  const [wardNumber, setWardNumber] = useState('W-001');

  useEffect(() => {
    setDownloaded(false);
  }, [jobId]);

  if (!jobId) return null;

  const handleDownload = async () => {
    setLoading(true);
    try {
      await downloadReport(jobId, cityName, wardNumber);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5 animate-slide-in-right" style={{ animationDelay: '0.25s' }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand-500/12 p-2.5 text-brand-200">
            <FileText size={18} />
          </div>
          <div>
            <p className="panel-kicker mb-1">Executive Output</p>
            <h2 className="text-sm font-semibold text-white">Audit report generation</h2>
          </div>
        </div>
        <div className="subtle-badge">PDF export</div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] text-surface-300/58">City / ULB</label>
          <input
            type="text"
            value={cityName}
            onChange={(event) => setCityName(event.target.value)}
            className="premium-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-surface-300/58">Ward Number</label>
          <input
            type="text"
            value={wardNumber}
            onChange={(event) => setWardNumber(event.target.value)}
            className="premium-field"
          />
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={loading}
        className={`w-full rounded-[22px] px-4 py-3 text-xs font-semibold transition-all duration-300
          ${downloaded
            ? 'border border-emerald-400/20 bg-emerald-500/12 text-emerald-300'
            : 'bg-gradient-to-r from-brand-200 via-brand-400 to-brand-600 text-surface-950 shadow-lg shadow-brand-500/10 hover:-translate-y-0.5'
          }
          ${loading ? 'opacity-70' : ''}
        `}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Generating PDF...
          </span>
        ) : downloaded ? (
          <span className="inline-flex items-center gap-2">
            <CheckCircle size={14} />
            Report downloaded
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Download size={14} />
            Generate PDF report
          </span>
        )}
      </button>

      <div className="section-divider mt-4 pt-3">
        <p className="panel-kicker mb-2">Included in the pack</p>
        <div className="space-y-1.5">
          {[
            'Asset detection summary and category confidence snapshot.',
            'Height estimation section when building candidates are available.',
            'Formatted certification block for governance or stakeholder review.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-[11px] leading-5 text-surface-300/64">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-300" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
