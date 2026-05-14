import React from 'react';
import { AlertTriangle, GitCompare, Layers3, ScanSearch } from 'lucide-react';
import { useDetectionStore } from '../store/detectionStore';
import ChangeDetection from './ChangeDetection';

function InsightCard({ title, items }) {
  return (
    <div className="glass-card p-5">
      <p className="panel-kicker mb-3">{title}</p>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-xs leading-6 text-surface-200/74">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeveritySnapshot({ regions = [] }) {
  const counts = regions.reduce((acc, region) => {
    const key = region.severity || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts);
  if (!entries.length) {
    return (
      <InsightCard
        title="Result posture"
        items={[
          'Process a pair first to unlock severity distribution and change-region triage.',
          'The strongest value here comes after the heatmap and ranked regions are available.',
          'Use the final region list as the short set for deeper field or GIS review.',
        ]}
      />
    );
  }

  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-2xl bg-orange-500/12 p-2.5 text-orange-300">
          <AlertTriangle size={18} />
        </div>
        <div>
          <p className="panel-kicker mb-1">Severity spread</p>
          <p className="text-sm font-semibold text-white">How the flagged regions break down</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {entries.map(([severity, count]) => (
          <div key={severity} className="rounded-[20px] border border-surface-700/18 bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-white">{severity}</span>
              <span className="text-[11px] font-mono text-surface-200/72">{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChangeWorkspace() {
  const { changeResult, changeLoading } = useDetectionStore();

  const stats = changeResult
    ? [
        ['Area changed', `${changeResult.change_percentage}%`],
        ['Regions', changeResult.total_change_regions],
        ['Similarity', `${(changeResult.ssim_score * 100).toFixed(1)}%`],
      ]
    : [
        ['Inputs', '02'],
        ['Output', 'Heatmap'],
        ['Mode', 'Triage'],
      ];

  return (
    <div className="space-y-5">
      <div className="glass-card p-5 md:p-6">
        <div className="flex flex-col gap-4 border-b border-surface-700/18 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-orange-500/12 p-3 text-orange-300">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <p className="panel-kicker mb-1">Temporal change console</p>
              <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-white">
                Compare before and after scenes without the extra page intro noise.
              </h3>
            </div>
          </div>
          <div className="subtle-badge">
            <Layers3 size={12} />
            {changeLoading ? 'Analyzing pair' : changeResult ? 'Results ready' : 'Pair workflow'}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className="metric-card">
              <p className="panel-kicker mb-2">{label}</p>
              <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card-static p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-3 border-b border-surface-700/18 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="panel-kicker mb-1">Main console</p>
            <p className="text-sm font-semibold text-white">
              Upload the pair, tune sensitivity, and review the resulting heatmap and region list in one place.
            </p>
          </div>
          <div className="subtle-badge">
            <ScanSearch size={12} />
            Before / after review
          </div>
        </div>
        <ChangeDetection />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCard
          title="Before / after checklist"
          items={[
            'Use the same geography and keep framing as close as possible.',
            'Large lighting or scale changes can look like change even when nothing material happened.',
            'Clearer pairs beat aggressive sensitivity when you want useful results.',
          ]}
        />

        <InsightCard
          title="Review sequence"
          items={[
            'Start with the overall change percentage, then look at the heatmap.',
            'Use the similarity score as context, not as the only decision signal.',
            'Treat the region list as the shortlist for follow-up review or field action.',
          ]}
        />

        <SeveritySnapshot regions={changeResult?.change_regions} />
      </div>
    </div>
  );
}
