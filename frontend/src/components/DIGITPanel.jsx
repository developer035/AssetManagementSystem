import React, { useEffect, useState } from 'react';
import { Cloud, CheckCircle, Database, Send } from 'lucide-react';
import { pushToDigit, getDigitStats } from '../services/api';
import { useDetectionStore } from '../store/detectionStore';

export default function DIGITPanel() {
  const { jobId, digitResult, digitLoading, setDigitLoading, setDigitResult, digitStats, setDigitStats } = useDetectionStore();
  const [cityName, setCityName] = useState('Bangalore');
  const [wardNumber, setWardNumber] = useState('W-001');
  const [pushed, setPushed] = useState(false);

  useEffect(() => {
    setPushed(false);
  }, [jobId]);

  const handlePush = async () => {
    if (!jobId) return;
    setDigitLoading(true);
    try {
      const result = await pushToDigit(jobId, cityName, wardNumber);
      setDigitResult(result);
      setPushed(true);
      const stats = await getDigitStats();
      setDigitStats(stats);
    } catch (err) {
      console.error('DIGIT push failed:', err);
      setDigitLoading(false);
    }
  };

  if (!jobId) return null;

  return (
    <div className="glass-card p-5 animate-slide-in-right" style={{ animationDelay: '0.15s' }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-500/12 p-2.5 text-cyan-300">
            <Cloud size={18} />
          </div>
          <div>
            <p className="panel-kicker mb-1">Registry Handoff</p>
            <h2 className="text-sm font-semibold text-white">DIGIT integration</h2>
          </div>
        </div>
        <div className="subtle-badge">Governance ready</div>
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
        onClick={handlePush}
        disabled={digitLoading || pushed}
        className={`w-full rounded-[22px] px-4 py-3 text-xs font-semibold transition-all duration-300
          ${pushed
            ? 'border border-emerald-400/20 bg-emerald-500/12 text-emerald-300'
            : 'bg-gradient-to-r from-cyan-300 via-sky-400 to-cyan-500 text-surface-950 shadow-lg shadow-cyan-500/10 hover:-translate-y-0.5'
          }
          ${digitLoading ? 'opacity-70' : ''}
        `}
      >
        {digitLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-surface-950/20 border-t-surface-950 animate-spin" />
            Pushing to DIGIT...
          </span>
        ) : pushed ? (
          <span className="inline-flex items-center gap-2">
            <CheckCircle size={14} />
            Registered in DIGIT
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Send size={14} />
            Push to DIGIT Registry
          </span>
        )}
      </button>

      {digitResult && (
        <div className="mt-3 rounded-[22px] border border-surface-700/20 bg-white/[0.02] p-3.5">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-surface-700/18 bg-surface-900/60 p-3">
              <p className="panel-kicker mb-1">Assets registered</p>
              <p className="text-lg font-semibold text-white">{digitResult.totalRegistered}</p>
            </div>
            <div className="rounded-2xl border border-surface-700/18 bg-surface-900/60 p-3">
              <p className="panel-kicker mb-1">Tenant</p>
              <p className="truncate text-xs font-mono text-surface-200">{digitResult.tenantId}</p>
            </div>
          </div>

          {digitResult.categoryBreakdown && (
            <div className="section-divider space-y-2 pt-3">
              {Object.entries(digitResult.categoryBreakdown).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between text-[11px] text-surface-300/72">
                  <span>{category}</span>
                  <span className="font-mono text-white">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {digitStats && digitStats.totalAssets > 0 && (
        <div className="section-divider mt-3 pt-3">
          <div className="flex items-center gap-2 text-[11px] text-surface-300/58">
            <Database size={12} className="text-surface-300/46" />
            Registry total: {digitStats.totalAssets} assets
          </div>
        </div>
      )}
    </div>
  );
}
