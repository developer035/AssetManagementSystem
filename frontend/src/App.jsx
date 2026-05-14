import React from 'react';
import {
  Satellite, Layers, GitCompare, Scan, Video, Activity, RotateCcw
} from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import ChangeWorkspace from './components/ChangeWorkspace';
import DetectionWorkspace from './components/DetectionWorkspace';
import LiveWorkspace from './components/LiveWorkspace';
import { useDetectionStore } from './store/detectionStore';

function OverviewBand({ kicker, title, description, cards }) {
  return (
    <section className="hero-band mb-6">
      <div className="relative grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <span className="eyebrow">{kicker}</span>
          <div className="max-w-3xl space-y-3">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-white md:text-[2.8rem]">
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-surface-200/80 md:text-[15px]">
              {description}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {cards.map((card) => (
            <div key={card.label} className="metric-card">
              <p className="panel-kicker mb-2">{card.label}</p>
              <strong className="block text-2xl font-semibold tracking-[-0.04em]">
                {card.value}
              </strong>
              <p className="mt-2 text-xs leading-6 text-surface-200/68">
                {card.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const {
    isLoading, error, detectionResult, resetAll, imageUrl, activeView, setActiveView, changeResult
  } = useDetectionStore();

  const hasGeoData = Boolean(
    detectionResult?.detections?.some((det) => Array.isArray(det.bbox_geo) && det.bbox_geo.length === 4)
  );

  const heroConfigs = {
    detect: {
      kicker: 'Spatial Operations',
      title: 'Turn overhead imagery into a polished, governance-ready asset command center.',
      description: detectionResult
        ? 'Your scan now opens into a dedicated multi-page workspace. Review the overlay, step into GIS, tune the control surface, then move into exports, reporting, heights, or DIGIT handoff without scrolling through one long stack.'
        : 'Upload satellite captures, orthomosaics, or drone stills and move straight into AI detection, map overlays, civic reporting, and export pipelines without leaving the workspace.',
      cards: detectionResult
        ? [
            {
              label: 'Assets surfaced',
              value: detectionResult.total_detections.toString().padStart(2, '0'),
              detail: 'Hybrid inference across specialized YOLO detectors and land-cover analysis.',
            },
            {
              label: 'Workspace model',
              value: 'PAGES',
              detail: 'Each downstream capability now lives in a dedicated feature page instead of a stacked side rail.',
            },
            {
              label: 'Spatial mode',
              value: hasGeoData ? 'GIS' : 'PIXEL',
              detail: hasGeoData
                ? 'Geo-referenced detections are ready for map overlays and external GIS tools.'
                : 'Standard imagery mode with export, reporting, and filtering still fully available.',
            },
          ]
        : [
            {
              label: 'Asset classes',
              value: '08',
              detail: 'Buildings, vegetation, roads, water, waste, drains, vehicles, and open space.',
            },
            {
              label: 'Inference stack',
              value: '05',
              detail: 'Multiple YOLO specialists blended with HSV analysis for resilient coverage.',
            },
            {
              label: 'Imagery ready',
              value: '50MB',
              detail: 'Optimized for JPG, PNG, WebP, and GeoTIFF uploads with export workflows built in.',
            },
          ],
    },
    change: {
      kicker: 'Temporal Intelligence',
      title: 'Compare the same geography across time with a cleaner, more executive-grade review surface.',
      description: changeResult
        ? 'The change summary is ready for triage. Use the heatmap, region list, and similarity score to identify material site shifts before they turn into field work.'
        : 'Bring in two passes of the same area and the system will spotlight land-use change, construction shifts, vegetation loss, and other temporal anomalies in one pass.',
      cards: changeResult
        ? [
            {
              label: 'Area changed',
              value: `${changeResult.change_percentage}%`,
              detail: 'Estimated share of the scene flagged by combined differencing and SSIM logic.',
            },
            {
              label: 'Change regions',
              value: String(changeResult.total_change_regions).padStart(2, '0'),
              detail: 'Prioritized regions are ranked by apparent severity and affected footprint.',
            },
            {
              label: 'Scene similarity',
              value: `${(changeResult.ssim_score * 100).toFixed(1)}%`,
              detail: 'A high-level structural similarity score to anchor the overall delta.',
            },
          ]
        : [
            {
              label: 'Image pair',
              value: '02',
              detail: 'Before and after imagery are aligned into a single temporal review flow.',
            },
            {
              label: 'Sensitivity',
              value: 'CTRL',
              detail: 'Adjust how aggressively the system treats local differences as meaningful change.',
            },
            {
              label: 'Outputs',
              value: 'MAP',
              detail: 'Receive a heatmap, structured summary, and ranked change regions for review.',
            },
          ],
    },
    live: {
      kicker: 'Streaming Review',
      title: 'Operate the live and recorded video pipeline with a calmer, premium monitoring surface.',
      description: 'Use your webcam as a drone stand-in, or upload recorded footage for sampled frame analysis, category counts, and downloadable annotated video.',
      cards: [
        {
          label: 'Live loop',
          value: 'CAM',
          detail: 'Stream JPEG frames to the backend for real-time overlays and category rollups.',
        },
        {
          label: 'Recorded video',
          value: 'MP4',
          detail: 'Upload footage for frame sampling, persistent annotations, and exportable outputs.',
        },
        {
          label: 'Operator view',
          value: 'HUD',
          detail: 'Confidence control, connection status, FPS, and detection count stay in one pane.',
        },
      ],
    },
  };

  const hero = heroConfigs[activeView];

  return (
    <div className="app-shell">
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />
      <div className="ambient-orb ambient-orb-c" />

      <header className="sticky top-0 z-50 border-b border-surface-700/20 bg-surface-950/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-300 via-brand-400 to-brand-700 shadow-glow">
                <Satellite className="h-5 w-5 text-surface-950" />
              </div>
              <div className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-surface-950 bg-emerald-300" />
            </div>
            <div>
              <p className="panel-kicker mb-1">Spatial Asset Intelligence</p>
              <h1 className="font-display text-lg font-semibold tracking-[-0.03em] text-white">
                Premium Urban Asset Review Workspace
              </h1>
            </div>
          </div>

          <div className="flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-surface-700/20 bg-surface-900/55 p-1 xl:w-auto">
            {[
              { key: 'detect', label: 'Asset Detection', icon: Scan },
              { key: 'change', label: 'Change Detection', icon: GitCompare },
              { key: 'live', label: 'Live Feed', icon: Video },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex min-w-fit items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200
                  ${activeView === key
                    ? 'bg-brand-500/18 text-brand-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'text-surface-300 hover:bg-white/5 hover:text-surface-100'
                  }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto xl:justify-end">
            <div className="subtle-badge">
              <Activity size={12} />
              End-to-end AI + GIS workflow
            </div>
            {detectionResult && (
              <div className="stat-badge">
                <Layers size={12} />
                {detectionResult.total_detections} assets found
              </div>
            )}
            {(detectionResult || imageUrl || changeResult) && (
              <button
                onClick={resetAll}
                id="reset-btn"
                className="btn-ghost flex items-center gap-1.5 text-xs"
              >
                <RotateCcw size={13} />
                New Scan
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8">
        {activeView === 'detect' && (
          <OverviewBand
            kicker={hero.kicker}
            title={hero.title}
            description={hero.description}
            cards={hero.cards}
          />
        )}

        {activeView === 'detect' && (
          <div className="space-y-5">
              {!detectionResult && !isLoading && (
                <div className="glass-card p-6 animate-fade-in">
                  <ImageUploader />
                </div>
              )}

              {isLoading && (
                <div className="glass-card p-8 animate-fade-in">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative h-24 w-24">
                      <div className="absolute inset-0 rounded-[26px] border border-brand-300/40" />
                      <div className="absolute inset-3 rounded-[20px] border border-brand-200/30 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Satellite className="h-8 w-8 text-brand-300 animate-float" />
                      </div>
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-semibold text-surface-100">Analyzing aerial imagery...</p>
                      <p className="text-xs text-surface-300/70">
                        Blending specialist detection models with land-cover analysis for a cleaner review pass.
                      </p>
                    </div>
                    <div className="shimmer h-1.5 w-72 rounded-full" />
                  </div>
                </div>
              )}

              {error && (
                <div className="glass-card border-red-500/30 p-5 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-red-500/10 p-2.5 text-red-300">!</div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-red-300">Detection failed</p>
                      <p className="text-xs leading-6 text-surface-300/80">{error}</p>
                      <button onClick={resetAll} className="btn-ghost mt-1 text-xs text-red-300">
                        Reset and try again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {detectionResult && (
                <div className="animate-slide-up">
                  <DetectionWorkspace hasGeoData={hasGeoData} />
                </div>
              )}
          </div>
        )}

        {activeView === 'change' && (
          <ChangeWorkspace />
        )}

        {activeView === 'live' && (
          <LiveWorkspace />
        )}
      </main>

      <footer className="relative z-10 mt-12 border-t border-surface-700/20">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-5 text-center sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:text-left">
          <p className="text-[11px] text-surface-300/36">
            Spatial Asset Intelligence v2.0 • Premium urban review shell • AI + GIS + governance workflows
          </p>
          <p className="text-[11px] text-surface-300/36">
            Detection • Change Analysis • Live Review • Exports • Heights • Reports • DIGIT Integration
          </p>
        </div>
      </footer>
    </div>
  );
}
